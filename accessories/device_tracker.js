'use strict';
var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantDeviceTrackerFactory;
};
module.exports.HomeAssistantDeviceTrackerFactory = HomeAssistantDeviceTrackerFactory;

function HomeAssistantDeviceTrackerFactory(log, data, client) {
    if (!(data.attributes)) {
        return null;
    }
    return new HomeAssistantDeviceTracker(log, data, client,
      Service.OccupancySensor,
      Characteristic.OccupancyDetected,
      Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
      Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
}

class HomeAssistantDeviceTracker {
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
          .setValue(new_state.state == 'home' ? this.onValue : this.offValue, null, 'internal');
    }
    identify(callback) {
        this.log('identifying: ' + this.name);
        callback();
    }
    getState(callback) {
        this.log('fetching state for: ' + this.name);
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, data.state == 'home' ? this.onValue : this.offValue);
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
          .setCharacteristic(Characteristic.Model, ' Device Tracker')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        return [informationService, this.sensorService];
    }
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
