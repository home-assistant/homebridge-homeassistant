'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantSwitch(log, data, client, type) {
  // device info
  this.domain = type || 'switch';
  this.data = data;
  this.entity_id = data.entity_id;
  this.uuid_base = data.entity_id;
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  } else {
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }

  this.client = client;
  this.log = log;
}

HomeAssistantSwitch.prototype = {
  onEvent(oldState, newState) {
    this.service.getCharacteristic(Characteristic.On)
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
        if (this.domain === 'scene') {
          this.service.getCharacteristic(Characteristic.On)
              .setValue('off', null, 'internal');
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
  getServices() {
    let model;

    switch (this.domain) {
      case 'scene':
        model = 'Scene';
        break;
      case 'input_boolean':
        model = 'Input boolean';
        break;
      default:
        model = 'Switch';
    }

    this.service = new Service.Switch();
    if (this.data && this.data.attributes && this.data.attributes.homebridge_switch_type === 'outlet') {
      this.service = new Service.Outlet();
      model = 'Outlet';
      this.service
          .getCharacteristic(Characteristic.OutletInUse)
          .on('get', this.getPowerState.bind(this));
    }
    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, model)
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

    if (this.domain === 'switch' || this.domain === 'input_boolean') {
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
