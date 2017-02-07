var Service, Characteristic;
var url = require('url')
  , request = require('request')
  , EventSource = require('eventsource');

var communicationError = new Error('Can not communicate with Home Assistant.');

var HomeAssistantBinarySensorFactory;
var HomeAssistantCoverFactory;
var HomeAssistantFan;
var HomeAssistantLight;
var HomeAssistantLock;
var HomeAssistantMediaPlayer;
var HomeAssistantSensorFactory;
var HomeAssistantSwitch;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    HomeAssistantLight = require('./accessories/light')(Service, Characteristic, communicationError);
    HomeAssistantSwitch = require('./accessories/switch')(Service, Characteristic, communicationError);
    HomeAssistantLock = require('./accessories/lock')(Service, Characteristic, communicationError);
    HomeAssistantMediaPlayer = require('./accessories/media_player')(Service, Characteristic, communicationError);
    HomeAssistantFan = require('./accessories/fan')(Service, Characteristic, communicationError);
    HomeAssistantCoverFactory = require('./accessories/cover')(Service, Characteristic, communicationError);
    HomeAssistantSensorFactory = require('./accessories/sensor')(Service, Characteristic, communicationError);
    HomeAssistantBinarySensorFactory = require('./accessories/binary_sensor')(Service, Characteristic, communicationError);

    homebridge.registerPlatform('homebridge-homeassistant', 'HomeAssistant', HomeAssistantPlatform, false);
};

function HomeAssistantPlatform(log, config, api){
    // auth info
    this.host = config.host;
    this.password = config.password;
    this.supportedTypes = config.supported_types || ['binary_sensor', 'cover', 'fan', 'input_boolean', 'light', 'lock', 'media_player', 'scene', 'sensor', 'switch'];
    this.foundAccessories = [];
    this.logging = config.logging !== undefined ? config.logging : true;

    this.log = log;

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object.
        this.api = api;
    }

    var es = new EventSource(config.host + '/api/stream?api_password=' + encodeURIComponent(this.password));
    es.addEventListener('message', function(e) {
        if (this.logging)
            this.log('Received event: ' + e.data);
        if (e.data == 'ping')
            return;

        var data = JSON.parse(e.data);
        if (data.event_type != 'state_changed')
            return;

        var numAccessories = this.foundAccessories.length;
        for (var i = 0; i < numAccessories; i++) {
            var accessory = this.foundAccessories[i];

            if (accessory.entity_id == data.data.entity_id && accessory.onEvent)
                accessory.onEvent(data.data.old_state, data.data.new_state);
        }
    }.bind(this));
}

HomeAssistantPlatform.prototype = {
    _request: function(method, path, options, callback) {
        var requestURL = this.host + '/api' + path;
        options = options || {};
        options.query = options.query || {};

        var reqOpts = {
            url: url.parse(requestURL),
            method: method || 'GET',
            qs: options.query,
            body: JSON.stringify(options.body),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-ha-access': this.password
            }
        };

        request(reqOpts, function onResponse(error, response, body) {
            if (error) {
                callback(error, response);
                return;
            }

            if (response.statusCode === 401) {
                callback(new Error('You are not authenticated'), response);
                return;
            }

            callback(error, response, JSON.parse(body));
        });

    },
    fetchState: function(entity_id, callback){
        this._request('GET', '/states/' + entity_id, {}, function(error, response, data){
            if (error) {
                callback(null);
            }else{
                callback(data);
            }
        });
    },
    callService: function(domain, service, service_data, callback){
        var options = {};
        options.body = service_data;

        this._request('POST', '/services/' + domain + '/' + service, options, function(error, response, data){
            if (error) {
                callback(null);
            }else{
                callback(data);
            }
        });
    },
    accessories: function(callback) {
        this.log('Fetching HomeAssistant devices.');

        var that = this;

        this._request('GET', '/states', {}, function(error, response, data){
            if (error) {
                that.log('Failed getting devices: ' + error + '. Retrying...');
                setTimeout(function() { that.accessories(callback); }, 5000);
                return;
            }

            for (var i = 0; i < data.length; i++) {
                var entity = data[i];
                var entity_type = entity.entity_id.split('.')[0];

                // ignore devices that are not in the list of supported types
                if (that.supportedTypes.indexOf(entity_type) == -1) {
                    continue;
                }

                // ignore hidden devices
                if (entity.attributes && entity.attributes.hidden) {
                    continue;
                }

                // ignore homebridge hidden devices
                if (entity.attributes && entity.attributes.homebridge_hidden) {
                    continue;
                }

                // support providing custom names
                if (entity.attributes && entity.attributes.homebridge_name) {
                    entity.attributes.friendly_name = entity.attributes.homebridge_name;
                }

                var accessory = null;

                if (entity_type == 'light') {
                    accessory = new HomeAssistantLight(that.log, entity, that);
                }else if (entity_type == 'switch'){
                    accessory = new HomeAssistantSwitch(that.log, entity, that);
                }else if (entity_type == 'lock'){
                    accessory = new HomeAssistantLock(that.log, entity, that);
                }else if (entity_type == 'garage_door'){
                    that.log.error('Garage_doors are no longer supported by homebridge-homeassistant. Please upgrade to a newer version of Home Assistant to continue using this entity (with the new cover component).');
                }else if (entity_type == 'scene'){
                    accessory = new HomeAssistantSwitch(that.log, entity, that, 'scene');
                }else if (entity_type == 'rollershutter'){
                    that.log.error('Rollershutters are no longer supported by homebridge-homeassistant. Please upgrade to a newer version of Home Assistant to continue using this entity (with the new cover component).');
                }else if (entity_type == 'media_player' && entity.attributes && entity.attributes.supported_media_commands){
                    accessory = new HomeAssistantMediaPlayer(that.log, entity, that);
                }else if (entity_type == 'input_boolean'){
                    accessory = new HomeAssistantSwitch(that.log, entity, that, 'input_boolean');
                }else if (entity_type == 'fan'){
                    accessory = new HomeAssistantFan(that.log, entity, that);
                }else if (entity_type == 'cover'){
                    accessory = HomeAssistantCoverFactory(that.log, entity, that);
                }else if (entity_type == 'sensor'){
                    accessory = HomeAssistantSensorFactory(that.log, entity, that);
                }else if (entity_type == 'binary_sensor' && entity.attributes && entity.attributes.sensor_class) {
                    accessory = HomeAssistantBinarySensorFactory(that.log, entity, that);
                }

                if (accessory) {
                    that.foundAccessories.push(accessory);
                }
            }

            callback(that.foundAccessories);
        });

    }
};

module.exports.platform = HomeAssistantPlatform;
