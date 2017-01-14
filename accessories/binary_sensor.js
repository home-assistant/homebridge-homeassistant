'use strict';
var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantBinarySensorFactory;
};
module.exports.HomeAssistantBinarySensorFactory = HomeAssistantBinarySensorFactory;

function HomeAssistantBinarySensorFactory(log, data, client) {
    if (!(data.attributes && data.attributes.sensor_class)) {
        return null;
    }
    switch(data.attributes.sensor_class) {
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
        log.error('\''+data.entity_id+'\' has a sensor_class of \''+data.attributes.sensor_class+'\' which is not supported by ' +
                'homebridge-homeassistant. Supported classes are \'moisture\', \'motion\', \'occupancy\', \'opening\' and \'smoke\'. '+
                'See the README.md for more information.');
        return null;
    }
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

    onEvent(old_state, new_state) {
        this.sensorService.getCharacteristic(this.characteristic)
          .setValue(new_state.state == 'on' ? this.onValue : this.offValue, null, 'internal');
    }
    identify(callback) {
        this.log('identifying: ' + this.name);
        callback();
    }
    getState(callback) {
        this.log('fetching state for: ' + this.name);
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, data.state == 'on' ? this.onValue : this.offValue);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    }
    getServices() {
        this.sensorService = new this.service();
        this.sensorService
          .getCharacteristic(this.characteristic)
          .on('get', this.getState.bind(this));

        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, toTitleCase(this.data.attributes.sensor_class) + ' Binary Sensor')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        return [informationService, this.sensorService];
    }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
