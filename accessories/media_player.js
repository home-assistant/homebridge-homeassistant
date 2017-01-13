var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantMediaPlayer;
};
module.exports.HomeAssistantMediaPlayer = HomeAssistantMediaPlayer;

function HomeAssistantMediaPlayer(log, data, client) {
    /* eslint-disable no-unused-vars */
    var SUPPORT_PAUSE = 1;
    var SUPPORT_SEEK = 2;
    var SUPPORT_VOLUME_SET = 4;
    var SUPPORT_VOLUME_MUTE = 8;
    var SUPPORT_PREVIOUS_TRACK = 16;
    var SUPPORT_NEXT_TRACK = 32;
    var SUPPORT_YOUTUBE = 64;
    var SUPPORT_TURN_ON = 128;
    var SUPPORT_TURN_OFF = 256;
    var SUPPORT_STOP = 4096;
    /* eslint-enable no-unused-vars */

    // device info
    this.domain = 'media_player';
    this.data = data;
    this.entity_id = data.entity_id;
    this.uuid_base = data.entity_id;
    this.supportedMediaCommands = data.attributes.supported_media_commands;

    if (data.attributes && data.attributes.friendly_name) {
        this.name = data.attributes.friendly_name;
    } else {
        this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }

    if ((this.supportedMediaCommands | SUPPORT_STOP) == this.supportedMediaCommands) {
        this.onState = 'playing';
        this.offState = 'idle';
        this.onService = 'media_play';
        this.offService = 'media_stop';
    } else if ((this.supportedMediaCommands | SUPPORT_PAUSE) == this.supportedMediaCommands) {
        this.onState = 'playing';
        this.offState = 'paused';
        this.onService = 'media_play';
        this.offService = 'media_pause';
    } else if ((this.supportedMediaCommands | SUPPORT_TURN_ON) == this.supportedMediaCommands && (this.supportedMediaCommands | SUPPORT_TURN_OFF) == this.supportedMediaCommands) {
        this.onState = 'on';
        this.offState = 'off';
        this.onService = 'turn_on';
        this.offService = 'turn_off';
    }

    this.client = client;
    this.log = log;
}

HomeAssistantMediaPlayer.prototype = {
    onEvent: function(old_state, new_state) {
        this.switchService.getCharacteristic(Characteristic.On)
          .setValue(new_state.state == this.onState, null, 'internal');
    },
    getPowerState: function(callback){
        this.log('fetching power state for: ' + this.name);

        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                var powerState = data.state == this.onState;
                callback(null, powerState);
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

            this.client.callService(this.domain, this.onService, service_data, function(data){
                if (data) {
                    that.log('Successfully set power state on the \''+that.name+'\' to on');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        } else {
            this.log('Setting power state on the \''+this.name+'\' to off');

            this.client.callService(this.domain, this.offService, service_data, function(data){
                if (data) {
                    that.log('Successfully set power state on the \''+that.name+'\' to off');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        }
    },
    getServices: function() {
        this.switchService = new Service.Switch();
        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, 'Media Player')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        this.switchService
          .getCharacteristic(Characteristic.On)
          .on('get', this.getPowerState.bind(this))
          .on('set', this.setPowerState.bind(this));

        return [informationService, this.switchService];
    }

};
