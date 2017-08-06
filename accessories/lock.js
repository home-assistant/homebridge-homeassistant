'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantLock(log, data, client) {
  this.batterySource = data.attributes.homebridge_battery_source;
  this.chargingSource = data.attributes.homebridge_charging_source;
  this.client = client;
  this.data = data;
  this.domain = 'lock';
  this.entityID = data.entity_id;
  this.log = log;
  if (data.attributes.homebridge_mfg) {
    this.mfg = String(data.attributes.homebridge_mfg);
  } else {
    this.mfg = 'Home Assistant';
  }
  if (data.attributes.homebridge_model) {
    this.model = String(data.attributes.homebridge_model);
  } else {
    this.model = 'Lock';
  }
  if (data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  } else {
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }
  if (data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.uuidBase = data.entity_id; // Do we actually need this line?
}
HomeAssistantLock.prototype = {
  onEvent(oldState, newState) {
    const lockState = newState.state === 'unlocked' ? 0 : 1;
    this.lockService.getCharacteristic(Characteristic.LockCurrentState)
      .setValue(lockState, null, 'internal');
    this.lockService.getCharacteristic(Characteristic.LockTargetState)
      .setValue(lockState, null, 'internal');
  },
  getLockState(callback) {
    this.client.fetchState(this.entityID, (data) => {
      if (data) {
        callback(null, data.state === 'locked');
      } else {
        callback(communicationError);
      }
    });
  },
  getBatteryLevel(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state));
      } else {
        callback(communicationError);
      }
    });
  },
  getChargingState(callback) {
    if (this.battery_source && this.chargingSource) {
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
  },
  getLowBatteryStatus(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state) > 20 ? 0 : 1);
      } else {
        callback(communicationError);
      }
    });
  },
  setLockState(lockOn, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }
    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entityID;
    if (lockOn) {
      this.log(`Setting lock state on the '${this.name}' to locked`);
      this.client.callService(this.domain, 'lock', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set lock state on the '${that.name}' to locked`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting lock state on the '${this.name}' to unlocked`);
      this.client.callService(this.domain, 'unlock', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set lock state on the '${that.name}' to unlocked`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.mfg)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);
    this.lockService = new Service.LockMechanism();
    this.lockService
      .getCharacteristic(Characteristic.LockCurrentState)
      .on('get', this.getLockState.bind(this));
    this.lockService
      .getCharacteristic(Characteristic.LockTargetState)
      .on('get', this.getLockState.bind(this))
      .on('set', this.setLockState.bind(this));
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
      return [informationService, this.lockService, this.batteryService];
    }
    return [informationService, this.lockService];
  },
};
function HomeAssistantLockPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;
  return HomeAssistantLock;
}
module.exports = HomeAssistantLockPlatform;
module.exports.HomeAssistantLock = HomeAssistantLock;
