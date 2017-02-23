'use strict';

var Service;
var Characteristic;
var communicationError;

class HomeAssistantClimate {
    constructor(log, data, client, service, characteristic, currentHeatingCoolingState, targetHeatingCoolingState, currentTemperature, targetTemperature, temperatureDisplayUnits) {
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

        this.entity_type = data.entity_id.split('.')[0];

        this.client = client;
        this.log = log;

        this.service = service;
        this.characteristic = characteristic;
        this.currentHeatingCoolingState = currentHeatingCoolingState;
        this.targetHeatingCoolingState = targetHeatingCoolingState;
        this.currentTemperature = currentTemperature;
        this.targetTemperature = targetTemperature;
        this.temperatureDisplayUnits = temperatureDisplayUnits;
    }

    onEvent(old_state, new_state) {
        this.thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
            .setValue(new_state.attributes.current_temperature , null, 'internal'),
        this.thermostatService.getCharacteristic(Characteristic.TargetTemperature)
            .setValue(new_state.attributes.temperature , null, 'internal');
    }
    identify(callback) {
        this.log('identifying: ' + this.name);
        callback();
    }
    getCurrentTemperature(callback) {
        this.log('fetching state for: ' + this.name);
        this.client.fetchState(this.entity_id, function (data) {
            if (data) {
                callback(null, data.attributes.current_temperature);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    getTargetTemperature(callback) {
        var targetTemp;
        this.client.fetchState(this.entity_id, function (data) {
            if (data) {
                if (!data.attributes.temperature || data.attributes.temperature < '10') {
                    targetTemp = '10';
                } else if (data.attributes.temperature < data.attributes.min_temp) {
                    targetTemp = data.attributes.min_temp;
                } else if (data.attributes.temperature > '38') {
                    targetTemp = data.attributes.max_temp || '38';
                } else {
                    targetTemp = data.attributes.temperature;
                }
                this.log("target Temp is : " + targetTemp);
                callback(null, targetTemp);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    setTargetTemperature(targetTemperature, callback, context) {
        if (context == 'internal') {
            callback();
            return;
        }

        var service_data = {};
        service_data.entity_id = this.entity_id;

        service_data.temperature = targetTemperature;
        this.log('Setting temperature on \''+this.name+'\' to \''+service_data.temperature+'\'');
        this.client.callService(this.domain, 'set_temperature', service_data, function(data){
            if (data) {
                callback();
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    getCurrentHeatingCoolingState(callback) {
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, ((data.Mode == 'Auto') ? 3 : 1));
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    getTargetHeatingCoolingState(callback) {
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, ((data.Mode == 'Auto') ? 3 : 1));
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    setTargetHeatingCoolingState(heatingState, callback, context) {
        var service = ''
            if (context == 'internal') {
                callback();
                return;
            }
        this.log("Heating State : " + heatingState);
        if ( heatingState == '0' ) {
            service = 'off';
        } else if ( heatingState == '1' ) {
            service = 'heat';
        } else if ( heatingState == '2' ) {
            service = 'cool';
        } else if ( heatingState == '3' ) {
            service = 'auto';
        }
        this.client.callService(this.domain, 'set_operation_mode', service , function(data){
            if (data) {
                this.log('Successfully set cooling state');
                callback();
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    getTemperatureDisplayUnits(callback) {
        this.client.fetchState(this.entity_id, function(data){
            if (data.attributes.unit_of_measurement == '°C') {
                callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
            } else if (data.attributes.unit_of_measurement == '°F') {
                callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
            } else {
                callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
            }
        }.bind(this));
    }

    getServices() {
        this.thermostatService = new Service.Thermostat();

        this.thermostatService
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on( 'get', this.getCurrentHeatingCoolingState.bind(this));
        this.thermostatService
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on( 'get', this.getTargetHeatingCoolingState.bind(this))
            .on( 'set', this.setTargetHeatingCoolingState.bind(this));
        this.thermostatService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on( 'get', this.getCurrentTemperature.bind(this));
        this.thermostatService
            .getCharacteristic(Characteristic.TargetTemperature)
            .on( 'get', this.getTargetTemperature.bind(this))
            .on( 'set', this.setTargetTemperature.bind(this));
        this.thermostatService
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on( 'get', this.getTemperatureDisplayUnits.bind(this));

        const informationService = new Service.AccessoryInformation()

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
            .setCharacteristic(Characteristic.Model, 'Generic Thermostat')
            .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        return [informationService, this.thermostatService];
    }
}

class HomeAssistantClimatePhysical extends HomeAssistantClimate {
    constructor(log, data, client, service, characteristic, currentHeatingCoolingState, targetHeatingCoolingState, currentTemperature, targetTemperature, temperatureDisplayUnits) {
    super(log, data, client, service, characteristic, currentHeatingCoolingState, targetHeatingCoolingState, currentTemperature, targetTemperature, temperatureDisplayUnits);
    this.currentRelativeHumidity = Characteristic.CurrentRelativeHumidity;
    this.targetRelativeHumidity = Characteristic.TargetRelativeHumidity;
    this.coolingThresholdTemperature = Characteristic.CoolingThresholdTemperature;
    this.heatingThresholdTemperature = Characteristic.HeatingThresholdTemperature;
  }
    // TODO
}

function HomeAssistantClimateFactory(log, data, client) {
    if (!(data.attributes)) {
        return null;
    }

    if (data.attributes.homebridge_climate_type === 'generic') {
        return new HomeAssistantClimate(log, data, client,
                Service.Thermostat,
                Characteristic.CurrentHeatingCoolingState,
                Characteristic.TargetHeatingCoolingState,
                Characteristic.CurrentTemperature,
                Characteristic.TargetTemperature,
                Characteristic.TemperatureDisplayUnits);
    } else {
        return new HomeAssistantClimatePhysical(log, data, client,
                Service.Thermostat,
                Characteristic.CurrentHeatingCoolingState,
                Characteristic.TargetHeatingCoolingState,
                Characteristic.CurrentTemperature,
                Characteristic.TargetTemperature,
                Characteristic.TemperatureDisplayUnits);
    }
}

function HomeAssistantClimateFactoryPlatform(oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantClimateFactory;
}

module.exports = HomeAssistantClimateFactoryPlatform;
module.exports.HomeAssistantClimateFactory = HomeAssistantClimateFactory;
