var Service;
var Characteristic;
var communicationError;


function fahrenheitToCelsius(temperature) {
  return (temperature - 32) / 1.8;
}

function getTempUnits(data) {
  // determine HomeAssistant temp. units (celsius vs. fahrenheit)
  // defaults to celsius
  var units = 'CELSIUS';
  if (data.attributes && data.attributes.unit_of_measurement) {
    var units = (data.attributes.unit_of_measurement === '°F') ? 'FAHRENHEIT' : 'CELSIUS';
  }
  return units;

function HomeAssistantClimate(log, data, client) {
    // device info

  this.domain = 'climate';
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
    this.model = 'Climate';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;
}
HomeAssistantClimate.prototype = {
  onEvent: function (oldState, newState) {
    const list = { 'idle': 0, 'heat': 1, 'cool': 2, 'auto': 3, 'off': 0 }
    this.ThermostatService.getCharacteristic(Characteristic.CurrentTemperature)
          .setValue(newState.attributes.current_temperature || newState.attributes.temperature, null, 'internal');
    this.ThermostatService.getCharacteristic(Characteristic.TargetTemperature)
          .setValue(newState.attributes.temperature, null, 'internal');
    this.ThermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .setValue(list[newState.state], null, 'internal');
  },
  getCurrentTemp: function (callback) {
    this.client.fetchState(this.entity_id, function (data) {
      if (data) {
        if (getTempUnits(data) === 'FAHRENHEIT') {
          callback(null, fahrenheitToCelsius(data.attributes.temperature))
        } else {
          callback(null, data.attributes.temperature)
        }
      } else {
        callback(communicationError);
      }
    });
  },
  getTargetTemp: function (callback) {
    this.client.fetchState(this.entity_id, function (data) { 
      if (data) {
        if (getTempUnits(data) === 'FAHRENHEIT') {
          callback(null, fahrenheitToCelsius(data.attributes.temperature))
        } else {
          callback(null, data.attributes.temperature)
        }
      } else {
        callback(communicationError);
      }
    });
  },
  setTargetTemp: function (value, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    var that = this;
    var serviceData = {};
    serviceData.entity_id = this.entity_id;
    serviceData.temperature = value;

    this.log(`Setting temperature on the '${this.name}' to ${serviceData.temperature}`);

    this.client.callService(this.domain, 'set_temperature', serviceData, function (data) {
      if (data) {
        that.log(`Successfully set temperature of '${that.name}'`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getTargetHeatingCoolingState: function (callback) {
    this.log('fetching Current Heating Cooling state for: ' + this.name);

    this.client.fetchState(this.entity_id, function (data) {
      if (data && data.attributes && data.attributes.operation_mode) {
        var state;
        switch (data.attributes.operation_mode) {
          case 'auto':
            state = Characteristic.TargetHeatingCoolingState.AUTO;
            break;
          case 'cool':
            state = Characteristic.TargetHeatingCoolingState.COOL;
            break;
          case 'heat':
            state = Characteristic.TargetHeatingCoolingState.HEAT;
            break;
          case 'idle':
          default:
            state = Characteristic.TargetHeatingCoolingState.OFF;
            break;
        }
        callback(null, state);
      } else {
        callback(communicationError);
      }
    });
  },

  setTargetHeatingCoolingState: function (value, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }
    var serviceData = {};
    serviceData.entity_id = this.entity_id;

    var mode = '';
    switch (value) {
      case Characteristic.TargetHeatingCoolingState.AUTO:
        mode = 'auto';
        break;
      case Characteristic.TargetHeatingCoolingState.COOL:
        mode = 'cool';
        break;
      case Characteristic.TargetHeatingCoolingState.HEAT:
        mode = 'heat';
        break;
      case Characteristic.TargetHeatingCoolingState.OFF:
      default:
        mode = 'idle';
        break;
    }

    serviceData.operation_mode = mode;
    this.log(`Setting Current Heating Cooling state on the '${this.name}' to ${mode}`);

    var that = this;

    this.client.callService(this.domain, 'set_operation_mode', serviceData, function (data) {
      if (data) {
        that.log(`Successfully set current heating cooling state of '${that.name}'`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },

  getServices: function () {
    this.ThermostatService = new Service.Thermostat();
    var informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, this.mfg)
          .setCharacteristic(Characteristic.Model, this.model)
          .setCharacteristic(Characteristic.SerialNumber, this.serial);

    // get our unit var -- default to celsius
    var units = (getTempUnits(this.data) === 'FAHRENHEIT') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;

    this.ThermostatService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .on('get', this.getCurrentTemp.bind(this));

    // default min/max/step for temperature
    var minTemp = 7.0;
    var maxTemp = 35.0;
    var tempStep = 0.5;

    if (units == Characteristic.TemperatureDisplayUnits.FAHRENHEIT) {
      if (this.data && this.data.attributes) {
        if (this.data.attributes.min_temp) {
          minTemp = fahrenheitToCelsius(this.data.attributes.min_temp);
        }
        if (this.data.attributes.max_temp) {
          maxTemp = fahrenheitToCelsius(this.data.attributes.max_temp);
        }
        if (this.data.attributes.target_temp_step) {
          tempStep = this.data.attributes.target_temp_step;
        }
      }
    } else {
      if (this.data && this.data.attributes) {
        if (this.data.attributes.min_temp) {
          minTemp = this.data.attributes.min_temp;
        }
        if (this.data.attributes.max_temp) {
          maxTemp = this.data.attributes.max_temp;
        }
        if (this.data.attributes.target_temp_step) {
          tempStep = this.data.attributes.target_temp_step;
        }
      }
    }

    this.ThermostatService
          .getCharacteristic(Characteristic.TargetTemperature)
          .setProps({ minValue: minTemp, maxValue: maxTemp, minStep: tempStep })
          .on('get', this.getTargetTemp.bind(this))
          .on('set', this.setTargetTemp.bind(this));

    this.ThermostatService
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .on('get', this.getTargetHeatingCoolingState.bind(this))
          .on('set', this.setTargetHeatingCoolingState.bind(this));

    this.ThermostatService.setCharacteristic(Characteristic.TemperatureDisplayUnits, units);

    return [informationService, this.ThermostatService];
  }


};

function HomeAssistantClimatePlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantClimate;
}

module.exports = HomeAssistantClimatePlatform;
module.exports.HomeAssistantClimate = HomeAssistantClimate;
