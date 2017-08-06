'use strict';

let Service;
let Characteristic;
let communicationError;

class HomeAssistantDeviceTracker {
  constructor(log, data, client, service, characteristic, onValue, offValue) {
    this.batterySource = data.attributes.homebridge_battery_source;
    this.characteristic = characteristic;
    this.chargingSource = data.attributes.homebridge_charging_source;
    this.client = client;
    this.data = data;
    this.entityID = data.entity_id;
    this.entityType = data.entity_id.split('.')[0]; // Do we actually need this line?
    if (data.attributes.homebridge_mfg) {
      this.mfg = String(data.attributes.homebridge_mfg);
    } else {
      this.mfg = 'Home Assistant';
    }
    if (data.attributes.homebridge_model) {
      this.model = String(data.attributes.homebridge_model);
    } else {
      this.model = 'Device Tracker';
    }
    if (data.attributes.friendly_name) {
      this.name = data.attributes.friendly_name;
    } else {
      this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }
    this.log = log;
    this.offValue = offValue;
    this.onValue = onValue;
    if (data.attributes.homebridge_serial) {
      this.serial = String(data.attributes.homebridge_serial);
    } else {
      this.serial = data.entity_id;
    }
    this.service = service;
    this.uuidBase = data.entity_id; // Do we actually need this line?
  }
  onEvent(oldState, newState) {
    this.sensorService.getCharacteristic(this.characteristic)
          .setValue(newState.state === 'home' ? this.onValue : this.offValue, null, 'internal');
  }
  identify(callback) {
    this.log('Identifying: ' + this.name);
    callback();
  }
  getState(callback) {
    this.log('Fetching state for: ' + this.name);
    this.client.fetchState(this.entityID, function (data) {
      if (data) {
        callback(null, data.state === 'home' ? this.onValue : this.offValue);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  }
  getBatteryLevel(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state));
      } else {
        callback(communicationError);
      }
    });
  }
  getChargingState(callback) {
    if (this.batterySource && this.chargingSource) {
      this.client.fetchState(this.chargingSource, (data) => {
        if (data) {
          callback(null, data.state.toLowerCase() === 'charging' ? 1 : 0);
        } else {
          callback(communicationError);
        }
      });
    } else {
      callback(null, 2);
    }
  }
  getLowBatteryStatus(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state) > 20 ? 0 : 1);
      } else {
        callback(communicationError);
      }
    });
  }
  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.mfg)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);
    this.sensorService = new this.service();
    this.sensorService
      .getCharacteristic(this.characteristic)
      .on('get', this.getState.bind(this));
    if (this.batterySource) {
      this.batteryService = new Service.BatteryService();
      this.batteryService
        .getCharacteristic(Characteristic.BatteryLevel)
        .setProps({ maxValue: 100, minValue: 0, minStep: 1 })
        .on('get', this.getBatteryLevel.bind(this));
      this.batteryService
        .getCharacteristic(Characteristic.ChargingState)
        .setProps({ maxValue: 2 })
        .on('get', this.getChargingState.bind(this));
      this.batteryService
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', this.getLowBatteryStatus.bind(this));
      return [informationService, this.batteryService, this.sensorService];
    }
    return [informationService, this.sensorService];
  }
}
function HomeAssistantDeviceTrackerFactory(log, data, client) {
  if (!(data.attributes)) {
    return null;
  }
  return new HomeAssistantDeviceTracker(log, data, client,
      Service.OccupancySensor,
      Characteristic.OccupancyDetected,
      Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
      Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
}
function HomeAssistantDeviceTrackerPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;
  return HomeAssistantDeviceTrackerFactory;
}
module.exports = HomeAssistantDeviceTrackerPlatform;
module.exports.HomeAssistantDeviceTrackerFactory = HomeAssistantDeviceTrackerFactory;
