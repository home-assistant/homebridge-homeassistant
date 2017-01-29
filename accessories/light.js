var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantLight;
};
module.exports.HomeAssistantLight = HomeAssistantLight;

function HomeAssistantLight(log, data, client) {
    // device info
    this.domain = 'light';
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

HomeAssistantLight.prototype = {
    features: Object.freeze({
        BRIGHTNESS: 1,
        COLOR_TEMP: 2,
        EFFECT: 4,
        FLASH: 8,
        RGB_COLOR: 16,
        TRANSITION: 32,
        XY_COLOR: 64,
    }),
    is_supported: function(feature) {
        // If the supported_features attribute doesn't exist, assume supported
        return this.data.attributes.supported_features === undefined ||
      ((this.data.attributes.supported_features & feature) > 0);
    },
    onEvent: function(old_state, new_state) {
        this.lightbulbService.getCharacteristic(Characteristic.On)
      .setValue(new_state.state == 'on', null, 'internal');
        if (this.is_supported(this.features.BRIGHTNESS)) {
            var brightness = Math.round(((new_state.attributes.brightness || 0) / 255) * 100);
            this.lightbulbService.getCharacteristic(Characteristic.Brightness)
              .setValue(brightness, null, 'internal');
        }
    },
    identify: function(callback){
        this.log('identifying: ' + this.name);

        var that = this;
        var service_data = {};
        service_data.entity_id = this.entity_id;
        service_data.flash = 'short';

        this.client.callService(this.domain, 'turn_on', service_data, function(data){
            if (data) {
                that.log('Successfully identified \''+that.name+'\'');
            }
            callback();
        }.bind(this));
    },
    getPowerState: function(callback){
        this.log('fetching power state for: ' + this.name);

        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                var powerState = data.state == 'on';
                callback(null, powerState);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    getBrightness: function(callback){
        this.log('fetching brightness for: ' + this.name);

        this.client.fetchState(this.entity_id, function(data){
            if (data && data.attributes) {
                var brightness = ((data.attributes.brightness || 0) / 255)*100;
                callback(null, brightness);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    setPowerState: function(powerOn, callback, context) {
        if (context == 'internal') {
            callback();
            return;
        }

        var that = this;
        var service_data = {};
        service_data.entity_id = this.entity_id;

        if (powerOn) {
            this.log('Setting power state on the \''+this.name+'\' to on');

            this.client.callService(this.domain, 'turn_on', service_data, function(data){
                if (data) {
                    that.log('Successfully set power state on the \''+that.name+'\' to on');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        } else {
            this.log('Setting power state on the \''+this.name+'\' to off');

            this.client.callService(this.domain, 'turn_off', service_data, function(data){
                if (data) {
                    that.log('Successfully set power state on the \''+that.name+'\' to off');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        }
    },
    setBrightness: function(level, callback, context) {
        if (context === 'internal') {
            callback();
            return;
        }

        var that = this;
        var service_data = {};
        service_data.entity_id = this.entity_id;

        service_data.brightness = 255*(level/100.0);

        // To make sure setBrightness is done after the setPowerState
        setTimeout(function() {
            this.log('Setting brightness on the \''+this.name+'\' to ' + level);
            this.client.callService(this.domain, 'turn_on', service_data, function(data){
                if (data) {
                    that.log('Successfully set brightness on the \''+that.name+'\' to ' + level);
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        }, 800);
    },
    getServices: function() {
        this.lightbulbService = new Service.Lightbulb();
        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, 'Light')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        this.lightbulbService
          .getCharacteristic(Characteristic.On)
          .on('get', this.getPowerState.bind(this))
          .on('set', this.setPowerState.bind(this));

        if (this.is_supported(this.features.BRIGHTNESS)) {
            this.lightbulbService
              .addCharacteristic(Characteristic.Brightness)
              .on('get', this.getBrightness.bind(this))
              .on('set', this.setBrightness.bind(this));
        }

        return [informationService, this.lightbulbService];
    }

};
