'use strict';

let Service;
let Characteristic;
global.WebSocket = require('ws');
const HAWS = require('home-assistant-js-websocket');

const communicationError = new Error('Can not communicate with Home Assistant.');

let HomeAssistantBinarySensorFactory;
let HomeAssistantCoverFactory;
let HomeAssistantFan;
let HomeAssistantLight;
let HomeAssistantLock;
let HomeAssistantMediaPlayer;
let HomeAssistantSensorFactory;
let HomeAssistantSwitch;
let HomeAssistantDeviceTrackerFactory;
let HomeAssistantClimate;

function HomeAssistantPlatform(log, config, api) {
  // auth info
  this.host = config.host.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
  this.password = config.password;
  this.supportedTypes = config.supported_types || ['binary_sensor', 'climate', 'cover', 'device_tracker', 'fan', 'group', 'input_boolean', 'light', 'lock', 'media_player', 'scene', 'sensor', 'switch'];
  this.foundAccessories = [];
  this.logging = config.logging !== undefined ? config.logging : true;

  this.log = log;

  if (api) {
    // Save the API object as plugin needs to register new accessory via this object.
    this.api = api;
  }

  this.allEntities = {};
}

HomeAssistantPlatform.prototype = {
  fetchState(entityID, callback) {
    callback(this.allEntities[entityID]);
  },
  callService(domain, service, serviceData, callback) {
    this.wsConn.callService(domain, service, serviceData).then(
      (data) => {
        callback(data);
      },
      (err) => {
        this.log('Error when calling service', err);
        callback(null);
      }
    );
  },
  accessories(callback) {
    this.log('Fetching HomeAssistant devices.');

    const that = this;

    HAWS.createConnection(`${this.host}/api/websocket`, { authToken: this.password }).then(
      (conn) => {
        that.log('Connection established to Home Assistant.');
        this.wsConn = conn;
        HAWS.subscribeEntities(conn, (states) => {
          this.allEntities = states;
          if (that.foundAccessories.length === 0) { // Only add accessories if we dont have any yet.
            Object.keys(states).forEach(function (key) {
              const entity = states[key];
              const entityType = HAWS.extractDomain(entity.entity_id);

              // ignore devices that are not in the list of supported types
              if (that.supportedTypes.indexOf(entityType) === -1) {
                return;
              }

              // ignore hidden devices
              if (entity.attributes && entity.attributes.hidden) {
                return;
              }

              // ignore homebridge hidden devices
              if (entity.attributes && entity.attributes.homebridge_hidden) {
                return;
              }

              // support providing custom names
              if (entity.attributes && entity.attributes.homebridge_name) {
                entity.attributes.friendly_name = entity.attributes.homebridge_name;
              }

              let accessory = null;

              if (entityType === 'light') {
                accessory = new HomeAssistantLight(that.log, entity, that);
              } else if (entityType === 'switch') {
                accessory = new HomeAssistantSwitch(that.log, entity, that);
              } else if (entityType === 'lock') {
                accessory = new HomeAssistantLock(that.log, entity, that);
              } else if (entityType === 'garage_door') {
                that.log.error('Garage_doors are no longer supported by homebridge-homeassistant. Please upgrade to a newer version of Home Assistant to continue using this entity (with the new cover component).');
              } else if (entityType === 'scene') {
                accessory = new HomeAssistantSwitch(that.log, entity, that, 'scene');
              } else if (entityType === 'rollershutter') {
                that.log.error('Rollershutters are no longer supported by homebridge-homeassistant. Please upgrade to a newer version of Home Assistant to continue using this entity (with the new cover component).');
              } else if (entityType === 'input_boolean') {
                accessory = new HomeAssistantSwitch(that.log, entity, that, 'input_boolean');
              } else if (entityType === 'fan') {
                accessory = new HomeAssistantFan(that.log, entity, that);
              } else if (entityType === 'cover') {
                accessory = HomeAssistantCoverFactory(that.log, entity, that);
              } else if (entityType === 'sensor') {
                accessory = HomeAssistantSensorFactory(that.log, entity, that);
              } else if (entityType === 'device_tracker') {
                accessory = HomeAssistantDeviceTrackerFactory(that.log, entity, that);
              } else if (entityType === 'climate') {
                accessory = new HomeAssistantClimate(that.log, entity, that);
              } else if (entityType === 'media_player' && entity.attributes && entity.attributes.supported_features) {
                accessory = new HomeAssistantMediaPlayer(that.log, entity, that);
              } else if (entityType === 'binary_sensor' && entity.attributes && entity.attributes.device_class) {
                accessory = HomeAssistantBinarySensorFactory(that.log, entity, that);
              } else if (entityType === 'group') {
                accessory = new HomeAssistantSwitch(that.log, entity, that, 'group');
              }

              if (accessory) {
                that.foundAccessories.push(accessory);
              }
            });

            callback(that.foundAccessories);
          }
        });
        conn.subscribeEvents((data) => {
          const numAccessories = this.foundAccessories.length;
          for (let i = 0; i < numAccessories; i++) {
            const accessory = this.foundAccessories[i];

            if (accessory.entity_id === data.data.entity_id && accessory.onEvent) {
              accessory.onEvent(data.data.old_state, data.data.new_state);
            }
          }
        }, 'state_changed');
      },
      (err) => {
        that.log('Connection failed with code', err);
      }
    );
  },
};

function HomebridgeHomeAssistant(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  /* eslint-disable global-require */
  HomeAssistantLight = require('./accessories/light')(Service, Characteristic, communicationError);
  HomeAssistantSwitch = require('./accessories/switch')(Service, Characteristic, communicationError);
  HomeAssistantLock = require('./accessories/lock')(Service, Characteristic, communicationError);
  HomeAssistantMediaPlayer = require('./accessories/media_player')(Service, Characteristic, communicationError);
  HomeAssistantFan = require('./accessories/fan')(Service, Characteristic, communicationError);
  HomeAssistantCoverFactory = require('./accessories/cover')(Service, Characteristic, communicationError);
  HomeAssistantSensorFactory = require('./accessories/sensor')(Service, Characteristic, communicationError);
  HomeAssistantBinarySensorFactory = require('./accessories/binary_sensor')(Service, Characteristic, communicationError);
  HomeAssistantDeviceTrackerFactory = require('./accessories/device_tracker')(Service, Characteristic, communicationError);
  HomeAssistantClimate = require('./accessories/climate')(Service, Characteristic, communicationError);
  /* eslint-enable global-require */

  homebridge.registerPlatform('homebridge-homeassistant', 'HomeAssistant', HomeAssistantPlatform, false);
}

module.exports = HomebridgeHomeAssistant;

module.exports.platform = HomeAssistantPlatform;
