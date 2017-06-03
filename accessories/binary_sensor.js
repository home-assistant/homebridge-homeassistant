'use strict';

let Service;
let Characteristic;
let communicationError;

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

class HomeAssistantBinarySensor {
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
        .setValue(newState.state === 'on' ? this.onValue : this.offValue, null, 'internal');
  }
  identify(callback) {
    this.log(`identifying: ${this.name}`);
    callback();
  }
  getState(callback) {
    this.log(`fetching state for: ${this.name}`);
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        callback(null, data.state === 'on' ? this.onValue : this.offValue);
      } else {
        callback(communicationError);
      }
    });
  }
  getServices() {
    this.sensorService = new this.service(); // eslint-disable-line new-cap
    this.sensorService
        .getCharacteristic(this.characteristic)
        .on('get', this.getState.bind(this));

    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, (!(data.attributes.homebridge_mfg)) ? 'Home Assistant' : this.data.attributes.homebridge_mfg)
          .setCharacteristic(Characteristic.Model, (!(data.attributes.homebridge_model)) ? `${toTitleCase(this.data.attributes.device_class)} Binary Sensor` : this.data.attributes.homebridge_model)
          .setCharacteristic(Characteristic.SerialNumber, (!(data.attributes.homebridge_serial)) ? this.entity_id : this.data.attributes.homebridge_serial);

    return [informationService, this.sensorService];
  }
}

function HomeAssistantBinarySensorFactory(log, data, client) {
  if (!(data.attributes && data.attributes.device_class)) {
    return null;
  }
  switch (data.attributes.device_class) {
    case 'gas':
      if (!(data.attributes.homebridge_gas_type)) {
        return new HomeAssistantBinarySensor(log, data, client,
                                             Service.CarbonMonoxideSensor,
                                             Characteristic.CarbonMonoxideDetected,
                                             Characteristic.LeakDetected.CO_LEVELS_ABNORMAL,
                                             Characteristic.LeakDetected.CO_LEVELS_NORMAL);
      }
      switch (data.attributes.homebridge_gas_type) {
        case 'co2':
          return new HomeAssistantBinarySensor(log, data, client,
                                               Service.CarbonDioxideSensor,
                                               Characteristic.CarbonDioxideDetected,
                                               Characteristic.LeakDetected.CO2_LEVELS_ABNORMAL,
                                               Characteristic.LeakDetected.CO2_LEVELS_NORMAL);
        case 'co':
          return new HomeAssistantBinarySensor(log, data, client,
                                               Service.CarbonMonoxideSensor,
                                               Characteristic.CarbonMonoxideDetected,
                                               Characteristic.LeakDetected.CO_LEVELS_ABNORMAL,
                                               Characteristic.LeakDetected.CO_LEVELS_NORMAL);
        default:
          return new HomeAssistantBinarySensor(log, data, client,
                                               Service.CarbonMonoxideSensor,
                                               Characteristic.CarbonMonoxideDetected,
                                               Characteristic.LeakDetected.CO_LEVELS_ABNORMAL,
                                               Characteristic.LeakDetected.CO_LEVELS_NORMAL);
      }
    case 'moisture':
      return new HomeAssistantBinarySensor(log, data, client,
                                           Service.LeakSensor,
                                           Characteristic.LeakDetected,
                                           Characteristic.LeakDetected.LEAK_DETECTED,
                                           Characteristic.LeakDetected.LEAK_NOT_DETECTED);
    case 'motion':
      return new HomeAssistantBinarySensor(log, data, client,
                                           Service.MotionSensor,
                                           Characteristic.MotionDetected,
                                           true,
                                           false);
    case 'occupancy':
      return new HomeAssistantBinarySensor(log, data, client,
                                           Service.OccupancySensor,
                                           Characteristic.OccupancyDetected,
                                           Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
                                           Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    case 'opening':
      return new HomeAssistantBinarySensor(log, data, client,
                                           Service.ContactSensor,
                                           Characteristic.ContactSensorState,
                                           Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
                                           Characteristic.ContactSensorState.CONTACT_DETECTED);
    case 'smoke':
      return new HomeAssistantBinarySensor(log, data, client,
                                           Service.SmokeSensor,
                                           Characteristic.SmokeDetected,
                                           Characteristic.SmokeDetected.SMOKE_DETECTED,
                                           Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    default:
      log.error(`'${data.entity_id}' has a device_class of '${data.attributes.device_class}' which is not supported by ` +
                'homebridge-homeassistant. Supported classes are \'gas\', \'moisture\', \'motion\', \'occupancy\', \'opening\' and \'smoke\'. ' +
                'See the README.md for more information.');
      return null;
  }
}

function HomeAssistantBinarySensorPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantBinarySensorFactory;
}

module.exports = HomeAssistantBinarySensorPlatform;
module.exports.HomeAssistantBinarySensorFactory = HomeAssistantBinarySensorFactory;
