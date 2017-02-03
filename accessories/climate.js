var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantClimate;
};
module.exports.HomeAssistantClimate = HomeAssistantClimate;

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
    onEvent: function(old_state, new_state) {
        this.ThermostatService.getCharacteristic(Characteristic.CurrentTemperature)
          .setValue(new_state.attributes.current_temperature, null, 'internal');
    },
    getCurrentTemp: function(callback){
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, data.attributes.current_temperature);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    getTargetTemp: function(callback){
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, data.attributes.temperature);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    setTargetTemp: function(value, callback, context) {
        if (context == 'internal') {
            callback();
            return;
        }

        var that = this;
        var service_data = {};
        service_data.entity_id = this.entity_id;

        if (value < 6) {
            service_data.temperature = 6;
        } else if (value > 30) {
            service_data.temperature = 30,5;
        } else{
            service_data.temperature = value;
        }
        this.log('Setting temperature on the \''+this.name+'\' to '+service_data.temperature);

        this.client.callService(this.domain, 'set_temperature', service_data, function(data){
            if (data) {
                that.log('Successfully set temperature of \''+that.name+'\' hi');
                callback();
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    getTargetHeatingCoolingState: function(callback){
        this.log('fetching Current Heating Cooling state for: ' + this.name);

        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                callback(null, ((data.Mode == 'Auto') ? 3 : 1));
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },


    getServices: function(){
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

        return [informationService, this.ThermostatService];

    }


};
