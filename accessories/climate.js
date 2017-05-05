var Service;
var Characteristic;
var communicationError;

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

  this.client = client;
  this.log = log;
}
HomeAssistantClimate.prototype = {
  onEvent: function (oldState, newState) {
    this.ThermostatService.getCharacteristic(Characteristic.CurrentTemperature)
          .setValue(newState.attributes.current_temperature || newState.attributes.temperature, null, 'internal');
    this.ThermostatService.getCharacteristic(Characteristic.TargetTemperature)
          .setValue(newState.attributes.temperature, null, 'internal');
  },
  getCurrentTemp: function (callback) {
    this.client.fetchState(this.entity_id, function (data) {
      if (data) {
        callback(null, data.attributes.current_temperature);
      } else {
        callback(communicationError);
      }
    });
  },
  getTargetTemp: function (callback) {
    this.client.fetchState(this.entity_id, function (data) {
      if (data) {
        callback(null, data.attributes.temperature);
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

        // clamp the values
    if (value < 6) {
      serviceData.temperature = 6;
    } else if (value > 30) {
      serviceData.temperature = 30;
    } else {
      serviceData.temperature = value;
    }
    this.log(`Setting temperature on the '${this.name}' to ${serviceData.temperature}`);

    this.client.callService(this.domain, 'set_temperature', serviceData, function (data) {
      if (data) {
        that.log(`Successfully set temperature of '${that.name}' hi`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getTargetHeatingCoolingState: function (callback) {
    this.log('fetching Current Heating Cooling state for: ' + this.name);

    this.client.fetchState(this.entity_id, function (data) {
      if (data) {
        callback(null, ((data.Mode === 'Auto') ? 3 : 1));
      } else {
        callback(communicationError);
      }
    });
  },


  getServices: function () {
    this.ThermostatService = new Service.Thermostat();
    var informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, 'Climate')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

    this.ThermostatService
          .getCharacteristic(Characteristic.CurrentTemperature)
          .setProps({ minValue: 4.5, maxValue: 30.5, minStep: 0.1 })
          .on('get', this.getCurrentTemp.bind(this));

    this.ThermostatService
          .getCharacteristic(Characteristic.TargetTemperature)
          .on('get', this.getTargetTemp.bind(this))
          .on('set', this.setTargetTemp.bind(this));

    this.ThermostatService
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .on('get', this.getTargetHeatingCoolingState.bind(this));

    if (this.data && this.data.attributes && this.data.attributes.unit_of_measurement) {
      var units = (this.data.attributes.unit_of_measurement === '°F') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
      this.ThermostatService
            .setCharacteristic(Characteristic.TemperatureDisplayUnits, units)
    }

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
