'use strict';

var Service;
var Characteristic;
var communicationError;

class HomeAssistantDeviceTracker {
  constructor(log, data, client, service, characteristic, onValue, offValue) {
        // device info
    this.data = data;
    this.entity_id = data.entity_id;
    this.uuid_base = data.entity_id;
    if (data.attributes && data.attributes.friendly_name) {
      this.name = data.attributes.friendly_name;
    } else {
      this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }
    if (data.attributes && data.attributes.homebridge_mfg) {
      this.mfg = String(data.attributes.homebridge_mfg);
    } else {
      this.mfg = 'Home Assistant';
    }
    if (data.attributes && data.attributes.homebridge_model) {
      this.model = String(data.attributes.homebridge_model);
    } else {
      this.model = 'Device Tracker';
    }
    if (data.attributes && data.attributes.homebridge_serial) {
      this.serial = String(data.attributes.homebridge_serial);
    } else {
      this.serial = data.entity_id;
    }
    this.entity_type = data.entity_id.split('.')[0];
    this.client = client;
    this.log = log;
    this.service = service;
    this.characteristic = characteristic;
    this.onValue = onValue;
    this.offValue = offValue;
  }

  onEvent(oldState, newState) {
    this.sensorService.getCharacteristic(this.characteristic)
          .setValue(newState.state === 'home' ? this.onValue : this.offValue, null, 'internal');
  }
  identify(callback) {
    this.log('identifying: ' + this.name);
    callback();
  }
  getState(callback) {
    this.log('fetching state for: ' + this.name);
    this.client.fetchState(this.entity_id, function (data) {
      if (data) {
        callback(null, data.state === 'home' ? this.onValue : this.offValue);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  }
  getServices() {
    this.sensorService = new this.service();
    this.sensorService
          .getCharacteristic(this.characteristic)
          .on('get', this.getState.bind(this));

    var informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, this.mfg)
          .setCharacteristic(Characteristic.Model, this.model)
          .setCharacteristic(Characteristic.SerialNumber, this.serial);

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

function HomeAssistantDeviceTrackerFactoryPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantDeviceTrackerFactory;
}

module.exports = HomeAssistantDeviceTrackerFactoryPlatform;
module.exports.HomeAssistantDeviceTrackerFactory = HomeAssistantDeviceTrackerFactory;
