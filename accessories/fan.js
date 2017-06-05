'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantFan(log, data, client) {
  // device info
  this.domain = 'fan';
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
    this.model = 'Fan';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;
}

HomeAssistantFan.prototype = {
  onEvent(oldState, newState) {
    this.fanService.getCharacteristic(Characteristic.On)
                   .setValue(newState.state === 'on', null, 'internal');
  },
  getPowerState(callback) {
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        const powerState = data.state === 'on';
        callback(null, powerState);
      } else {
        callback(communicationError);
      }
    });
  },
  setPowerState(powerOn, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;

    if (powerOn) {
      this.log(`Setting power state on the '${this.name}' to on`);

      this.client.callService(this.domain, 'turn_on', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to on`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting power state on the '${this.name}' to off`);

      this.client.callService(this.domain, 'turn_off', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to off`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getRotationSpeed(callback) {
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        if (data.state === 'off') {
          callback(null, 0);
        } else {
          switch (data.attributes.speed) {
            case 'low':
              callback(null, 25);
              break;
            case 'medium':
              callback(null, 50);
              break;
            case 'high':
              callback(null, 100);
              break;
            default:
              callback(null, 0);
          }
        }
      } else {
        callback(communicationError);
      }
    });
  },
  setRotationSpeed(speed, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;

    if (speed <= 25) {
      serviceData.speed = 'low';
    } else if (speed <= 75) {
      serviceData.speed = 'medium';
    } else if (speed <= 100) {
      serviceData.speed = 'high';
    }

    this.log(`Setting speed on the '${this.name}' to ${serviceData.speed}`);

    this.client.callService(this.domain, 'set_speed', serviceData, (data) => {
      if (data) {
        that.log(`Successfully set power state on the '${that.name}' to on`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getServices() {
    this.fanService = new Service.Fan();
    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, this.mfg)
          .setCharacteristic(Characteristic.Model, this.model)
          .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.fanService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    this.fanService
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getRotationSpeed.bind(this))
        .on('set', this.setRotationSpeed.bind(this));

    return [informationService, this.fanService];
  },

};

function HomeAssistantFanPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantFan;
}

module.exports = HomeAssistantFanPlatform;
module.exports.HomeAssistantFan = HomeAssistantFan;
