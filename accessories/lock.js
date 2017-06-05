'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantLock(log, data, client) {
  // device info
  this.domain = 'lock';
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
    this.model = 'Lock';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;
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
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        const lockState = data.state === 'locked';
        callback(null, lockState);
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
    serviceData.entity_id = this.entity_id;

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
    this.lockService = new Service.LockMechanism();
    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, this.mfg)
          .setCharacteristic(Characteristic.Model, this.model)
          .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.lockService
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', this.getLockState.bind(this));

    this.lockService
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', this.getLockState.bind(this))
        .on('set', this.setLockState.bind(this));

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
