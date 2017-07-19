'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantMediaPlayer(log, data, client) {
  /* eslint-disable no-unused-vars */
  const SUPPORT_PAUSE = 1;
  const SUPPORT_SEEK = 2;
  const SUPPORT_VOLUME_SET = 4;
  const SUPPORT_VOLUME_MUTE = 8;
  const SUPPORT_PREVIOUS_TRACK = 16;
  const SUPPORT_NEXT_TRACK = 32;
  const SUPPORT_YOUTUBE = 64;
  const SUPPORT_TURN_ON = 128;
  const SUPPORT_TURN_OFF = 256;
  const SUPPORT_STOP = 4096;
  /* eslint-enable no-unused-vars */

  // device info
  this.domain = 'media_player';
  this.data = data;
  this.entity_id = data.entity_id;
  this.uuid_base = data.entity_id;
  this.supportedFeatures = data.attributes.supported_features;

  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  } else {
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }

  const supportPause = (this.supportedFeatures | SUPPORT_PAUSE) === this.supportedFeatures;
  const supportStop = (this.supportedFeatures | SUPPORT_STOP) === this.supportedFeatures;
  const supportOnOff = ((this.supportedFeatures | SUPPORT_TURN_ON) === this.supportedFeatures &&
                          (this.supportedFeatures | SUPPORT_TURN_OFF) === this.supportedFeatures);

  if (this.data && this.data.attributes && this.data.attributes.homebridge_media_player_switch === 'on_off' && supportOnOff) {
    this.onState = 'on';
    this.offState = 'off';
    this.onService = 'turn_on';
    this.offService = 'turn_off';
  } else if (this.data && this.data.attributes && this.data.attributes.homebridge_media_player_switch === 'play_stop' && supportStop) {
    this.onState = 'playing';
    this.offState = 'idle';
    this.onService = 'media_play';
    this.offService = 'media_stop';
  } else if (supportPause) {
    this.onState = 'playing';
    this.offState = 'paused';
    this.onService = 'media_play';
    this.offService = 'media_pause';
  } else if (supportStop) {
    this.onState = 'playing';
    this.offState = 'idle';
    this.onService = 'media_play';
    this.offService = 'media_stop';
  } else if (supportOnOff) {
    this.onState = 'on';
    this.offState = 'off';
    this.onService = 'turn_on';
    this.offService = 'turn_off';
  }

  this.client = client;
  this.log = log;
}

HomeAssistantMediaPlayer.prototype = {
  onEvent(oldState, newState) {
    this.switchService.getCharacteristic(Characteristic.On)
        .setValue(newState.state !== this.offState, null, 'internal');
  },
  getPowerState(callback) {
    this.log(`fetching power state for: ${this.name}`);

    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        const powerState = data.state !== this.offState;
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

      this.client.callService(this.domain, this.onService, serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to on`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting power state on the '${this.name}' to off`);

      this.client.callService(this.domain, this.offService, serviceData, (data) => {
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
    this.switchService = new Service.Switch();
    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, 'Media Player')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

    this.switchService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    return [informationService, this.switchService];
  },

};

function HomeAssistantMediaPlayerPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantMediaPlayer;
}

module.exports = HomeAssistantMediaPlayerPlatform;
module.exports.HomeAssistantMediaPlayer = HomeAssistantMediaPlayer;
