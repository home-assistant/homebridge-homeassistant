'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantSwitch(log, data, client, type) {
  this.client = client;
  this.data = data;
  this.domain = type;
  this.entityID = data.entity_id;
  this.log = log;
  if (data.attributes.homebridge_mfg) {
    this.mfg = String(data.attributes.homebridge_mfg);
  } else {
    this.mfg = 'Home Assistant';
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
HomeAssistantSwitch.prototype = {
  onEvent(oldState, newState) {
    this.service.getCharacteristic(Characteristic.On)
        .setValue(newState.state === 'on', null, 'internal');
  },
  getPowerState(callback) {
    this.client.fetchState(this.entityID, (data) => {
      if (data) {
        callback(null, data.state === 'on');
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
    const callDomain = this.domain === 'group' ? 'homeassistant' : this.domain;
    serviceData.entity_id = this.entityID;
    if (powerOn) {
      this.log(`Setting power state on the '${this.name}' to on`);
      this.client.callService(callDomain, 'turn_on', serviceData, (data) => {
        if (this.domain === 'scene') {
          setTimeout(() => {
            this.service.getCharacteristic(Characteristic.On)
                .setValue(false, null, 'internal');
          }, 500);
        }
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to on`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting power state on the '${this.name}' to off`);
      this.client.callService(callDomain, 'turn_off', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to off`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getServices() {
    let model;
    switch (this.domain) {
      case 'automation':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else {
          model = 'Automation';
        }
        break;
      case 'group':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else {
          model = 'Group';
        }
        break;
      case 'input_boolean':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else {
          model = 'Input Boolean';
        }
        break;
      case 'remote':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else {
          model = 'Remote';
        }
        break;
      case 'scene':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else {
          model = 'Scene';
        }
        break;
      case 'switch':
        if (this.data.attributes.homebridge_model) {
          model = String(this.data.attributes.homebridge_model);
        } else if (this.data.attributes.homebridge_switch_type === 'outlet') {
          model = 'Outlet';
        } else {
          model = 'Switch';
        }
        break;
      default:
        model = 'Switch';
    }
    this.service = new Service.Switch();
    if (this.data.attributes.homebridge_switch_type === 'outlet') {
      this.service = new Service.Outlet();
      this.service
        .getCharacteristic(Characteristic.OutletInUse)
        .on('get', this.getPowerState.bind(this));
    }
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.mfg)
      .setCharacteristic(Characteristic.Model, model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial);
    if (this.domain === 'automation' || this.domain === 'group' || this.domain === 'input_boolean'
        || this.domain === 'remote' || this.domain === 'switch') {
      this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));
    } else {
      this.service
        .getCharacteristic(Characteristic.On)
        .on('set', this.setPowerState.bind(this));
    }
    return [informationService, this.service];
  },
};
function HomeAssistantSwitchPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;
  return HomeAssistantSwitch;
}
module.exports = HomeAssistantSwitchPlatform;
module.exports.HomeAssistantSwitch = HomeAssistantSwitch;
