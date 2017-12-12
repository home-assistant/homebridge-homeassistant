'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantAirConditioner(log, data, client) {
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
    this.model = 'AirConditioner';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;

  this.speedList = data.attributes.fan_list;
  this.maxValue = this.speedList.length;
  if (!(data.attributes.operation_mode in {'off': '', 'idle': ''})){
    this.last_operation_mode = data.attributes.operation_mode;
  } else {
    this.last_operation_mode = 'auto'
  }
}

HomeAssistantAirConditioner.prototype = {
  onEvent(oldState, newState) {
    var powerState = !(newState.attributes.operation_mode in {'off': '', 'idle': ''});
    var fan_speed = this.speedList.indexOf(newState.attributes.fan_mode) + 1;
    const list = {'idle':0, 'heat':1, 'cool':2, 'auto':3, 'off':0}
    if (newState.attributes.operation_mode 
      !== oldState.attributes.operation_mode && powerState) {
      this.last_operation_mode = newState.attributes.operation_mode;
      }
    if (powerState) {
      this.fanService.getCharacteristic(Characteristic.RotationSpeed)
        .setValue(fan_speed, null, 'internal');
    }
    this.fanService.getCharacteristic(Characteristic.On)
      .setValue(powerState, null, 'internal');
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
      if (data) {
        var state;
        switch (data.state) {
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
        that.log(`Successfully set current heating cooling state of '${that.name}' to ${mode}`);
        callback();
      } else {
        callback(communicationError);
      }
    });
  },
  getPowerState(callback) {
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        callback(null, !(data.attributes.operation_mode in {'off': '', 'idle': ''}));
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

    var that = this;
    var serviceData = {};
    serviceData.entity_id = this.entity_id;

    if (powerOn) {       
      serviceData.operation_mode = this.last_operation_mode;

      this.log(`Setting power state on the '${this.name}' to on`);

      this.client.callService(this.domain, 'set_operation_mode', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to on`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      serviceData.operation_mode = 'idle';
      this.log(`Setting power state on the '${this.name}' to off`);

      this.client.callService(this.domain, 'set_operation_mode', serviceData, (data) => {
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
        if (!(data.attributes.operation_mode in {'off': '', 'idle': ''})) {
          callback(null, this.speedList.indexOf(data.attributes.fan_mode) + 1);            
        } else {
          callback(null, 0);
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

    if (speed === 0) {
      serviceData.operation_mode = 'idle';
      this.log(`Setting power state on the '${this.name}' to off`);

      this.client.callService(this.domain, 'set_operation_mode', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set power state on the '${that.name}' to off`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.client.fetchState(this.entity_id, (data) => {
        if (data) {
          for (var index = 0; index < this.speedList.length - 1; index += 1) { 
            if (speed === index + 1) {
              serviceData.fan_mode = this.speedList[index];
              break;
            }
          }
          if (!serviceData.fan_mode) {
            serviceData.fan_mode = this.speedList[this.speedList.length - 1];
          }
          
          this.log(`Setting speed on the '${this.name}' to ${serviceData.fan_mode}`);

          this.client.callService(this.domain, 'set_fan_mode', serviceData, (data2) => {
            if (data2) {
              that.log(`Successfully set power state on the '${that.name}' to on`);
              callback();
            } else {
              callback(communicationError);
            }
          });
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getServices() {
    this.fanService = new Service.Fan();
    this.ThermostatService = new Service.Thermostat();
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
      .setProps({
        minValue: 0,
        maxValue: this.maxValue,
        minStep: 1
      })
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));

    this.ThermostatService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemp.bind(this));

    var minTemp = 17.0;
    var maxTemp = 30.0;
    var tempStep = 1;

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

    this.ThermostatService
      .getCharacteristic(Characteristic.TargetTemperature)
      .setProps({ minValue: minTemp, maxValue: maxTemp, minStep: tempStep })
      .on('get', this.getTargetTemp.bind(this))
      .on('set', this.setTargetTemp.bind(this));

    this.ThermostatService
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', this.getTargetHeatingCoolingState.bind(this))
      .on('set', this.setTargetHeatingCoolingState.bind(this));

    if (this.data && this.data.attributes && this.data.attributes.unit_of_measurement) {
      var units = (this.data.attributes.unit_of_measurement === '°F') ? Characteristic.TemperatureDisplayUnits.FAHRENHEIT : Characteristic.TemperatureDisplayUnits.CELSIUS;
      this.ThermostatService
          .setCharacteristic(Characteristic.TemperatureDisplayUnits, units);
    }

    return [informationService, this.fanService, this.ThermostatService];
  },

};

function HomeAssistantAirConditionerPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantAirConditioner;
}

module.exports = HomeAssistantAirConditionerPlatform;
module.exports.HomeAssistantAirConditioner = HomeAssistantAirConditioner;
