'use strict';
let Service;
let Characteristic;
let communicationError;
class HomeAssistantSensor {
  constructor(log, data, client, service, characteristic, transformData) {
    this.batterySource = data.attributes.homebridge_battery_source;
    this.characteristic = characteristic;
    this.chargingSource = data.attributes.homebridge_charging_source;
    this.client = client;
    this.data = data;
    this.entityID = data.entity_id;
    this.entityType = data.entity_id.split('.')[0]; // Do we actually need this line?
    this.log = log;
    if (data.attributes.homebridge_mfg) {
      this.mfg = String(data.attributes.homebridge_mfg);
    } else {
      this.mfg = 'Home Assistant';
    }
    if (data.attributes.homebridge_model) {
      this.model = String(data.attributes.homebridge_model);
    } else {
      this.model = 'Sensor';
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
    this.service = service;
    if (transformData) {
      this.transformData = transformData;
    }
    this.uuidBase = data.entity_id; // Do we actually need this line?
  }
  transformData(data) {
    return parseFloat(data.state);
  }
  onEvent(oldState, newState) {
    if (this.service === Service.CarbonDioxideSensor) {
      const transformed = this.transformData(newState);
      this.sensorService.getCharacteristic(this.characteristic)
          .setValue(transformed, null, 'internal');
      const abnormal = Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL;
      const normal = Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL;
      const detected = (transformed > 1000 ? abnormal : normal);
      this.sensorService.getCharacteristic(Characteristic.CarbonDioxideDetected)
          .setValue(detected, null, 'internal');
    } else if (this.service === Service.CarbonMonoxideSensor) {
      const transformed = this.transformData(newState);
      this.sensorService.getCharacteristic(this.characteristic)
          .setValue(transformed, null, 'internal');
      const abnormal = Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL;
      const normal = Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
      const detected = (transformed > 70 ? abnormal : normal);
      this.sensorService.getCharacteristic(Characteristic.CarbonMonoxideDetected)
          .setValue(detected, null, 'internal');
    } else {
      this.sensorService.getCharacteristic(this.characteristic)
          .setValue(this.transformData(newState), null, 'internal');
    }
  }
  identify(callback) {
    this.log(`identifying: ${this.name}`);
    callback();
  }
  getState(callback) {
    this.log(`fetching state for: ${this.name}`);
    this.client.fetchState(this.entityID, (data) => {
      if (data) {
        callback(null, this.transformData(data));
      } else {
        callback(communicationError);
      }
    });
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
    if (this.battery_source && this.chargingSource) {
      this.client.fetchState(this.chargingSource, (data) => {
        if (data) {
          callback(null, data.state === 'charging' ? 1 : 0);
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
    this.sensorService = new this.service(); // eslint-disable-line new-cap
    this.sensorService
        .getCharacteristic(this.characteristic)
        .setProps({ minValue: -50 })  // Need to modify this value depending on the type of sensor being created?
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
    } else {
      return [informationService, this.sensorService];
    }
  }
}
function HomeAssistantSensorFactory(log, data, client) {
  if (!data.attributes) {
    return null;
  }
  let service;
  let characteristic;
  let transformData;
  if (data.attributes.homebridge_sensor_type === 'air_quality' && data.attributes.unit_of_measurement.toLowerCase() === 'aqi') {
    service = Service.AirQualitySensor;
    characteristic = Characteristic.AirQuality;
    transformData = function transformData(dataToTransform) { // eslint-disable-line no-shadow
      let value = parseFloat(dataToTransform.state);
      if (value <= 75) {
        return 1;
      } else if (value >= 76 && value <= 150) {
        return 2;
      } else if (value >= 151 && value <= 225) {
        return 3;
      } else if (value >= 226 && value <= 300) {
        return 4;
      } else if (value >= 301) {
        return 5;
      } else {
        return 0;
      }
    };
  } else if (data.attributes.homebridge_sensor_type === 'co2' && (typeof data.attributes.unit_of_measurement === 'string' && data.attributes.unit_of_measurement.toLowerCase() === 'ppm')) {
    service = Service.CarbonDioxideSensor;
    characteristic = Characteristic.CarbonDioxideLevel;
    transformData = function transformData(dataToTransform) { // eslint-disable-line no-shadow
      let value = parseFloat(dataToTransform.state);
      if (value < 0) {
        return 0;
      } else if (value > 100000) {
        return 100000;
      } else {
        return value;
        //return (Math.round(value / 100) * 100);
      }
    };
  } else if (data.attributes.homebridge_sensor_type === 'co' && (typeof data.attributes.unit_of_measurement === 'string' && data.attributes.unit_of_measurement.toLowerCase() === 'ppm')) {
    service = Service.CarbonMonoxideSensor;
    characteristic = Characteristic.CarbonMonoxideLevel;
    transformData = function transformData(dataToTransform) { // eslint-disable-line no-shadow
      let value = parseFloat(dataToTransform.state);
      if (value < 0) {
        return 0;
      } else if (value > 100) {
        return 100;
      } else {
        return value;
        //return parseFloat(Math.round(value * 100) / 100).toFixed(2);
      }
    };
  } else if (data.attributes.homebridge_sensor_type === 'humidity' && data.attributes.unit_of_measurement === '%') {
    service = Service.HumiditySensor;
    characteristic = Characteristic.CurrentRelativeHumidity;
  } else if (data.attributes.homebridge_sensor_type === 'light' && (typeof data.attributes.unit_of_measurement === 'string' && (data.attributes.unit_of_measurement.toLowerCase() === 'lux' || data.attributes.unit_of_measurement.toLowerCase() === 'lx'))) {
    service = Service.LightSensor;
    characteristic = Characteristic.CurrentAmbientLightLevel;
    transformData = function transformData(dataToTransform) { // eslint-disable-line no-shadow
      let value = parseFloat(dataToTransform.state);
      if (value < 0.0001) {
        return 0.0001;
      } else if (value > 100000) {
        return 100000;
      } else {
        return value;
        //return parseFloat(Math.round(value * 10000) / 10000).toFixed(4);
      }
    };
  } else if (data.attributes.homebridge_sensor_type === 'temperature' && (data.attributes.unit_of_measurement === '°C' || data.attributes.unit_of_measurement === '°F')) {
    service = Service.TemperatureSensor;
    characteristic = Characteristic.CurrentTemperature;
    transformData = function transformData(dataToTransform) { // eslint-disable-line no-shadow
      let value = parseFloat(dataToTransform.state);
      // HomeKit only works with Celsius internally
      if (dataToTransform.attributes.unit_of_measurement === '°F') {
        value = (value - 32) / 1.8;
      }
      return value;
    };
  } else {
    return null;
  }
  return new HomeAssistantSensor(log, data, client, service, characteristic, transformData);
}
function HomeAssistantSensorPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;
  return HomeAssistantSensorFactory;
}
module.exports = HomeAssistantSensorPlatform;
module.exports.HomeAssistantSensorFactory = HomeAssistantSensorFactory;
