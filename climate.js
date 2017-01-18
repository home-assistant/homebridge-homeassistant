//Received event: {"event_type": "state_changed", "time_fired": "2017-01-17T20:04:21.397530+00:00",
// "data": {"entity_id": "climate.neq1224255",

// "old_state": {"state": "auto", "entity_id": "climate.neq1224255", "last_changed": "2017-01-17T18:50:02.865910+00:00",
// "last_updated": "2017-01-17T20:04:21.334921+00:00",
// "attributes": {"Battery": 3.0, "temperature": 23.0, "friendly_name": "NEQ1224255", "min_temp": 4.5,
// "operation_mode": "auto", "Valve": 0, "proxy": "wireless", "max_temp": 30.5, "Mode": "Auto", "ID": "NEQ1224255",
// "operation_list": ["manual", "auto", "boost"], "unit_of_measurement": "\u00b0C", "RSSI": -19, "current_temperature": 16.9}},
 
//"new_state": {"state": "auto", "entity_id": "climate.neq1224255", "last_changed": "2017-01-17T18:50:02.865910+00:00",
// "last_updated": "2017-01-17T20:04:21.397331+00:00",
// "attributes": {"Battery": 3.0, "temperature": 21.0, "friendly_name": "NEQ1224255", "min_temp": 4.5,
// "operation_mode": "auto", "Valve": 0, "proxy": "wireless", "max_temp": 30.5, "Mode": "Auto", "ID": "NEQ1224255",
// "operation_list": ["manual", "auto", "boost"], "unit_of_measurement": "\u00b0C", "RSSI": -19, "current_temperature": 16.9}}}, "origin": "LOCAL"}



var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantClimate;
};
module.exports.HomeAssistantClimate = HomeAssistantClimate;

function HomeAssistantClimate(log, data, client, type) {
    // device info

    this.domain = type || 'climate';
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
                var CurrentTemp = data.attributes.current_temperature;
                callback(null, CurrentTemp);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    getTargetTemp: function(callback){
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                var TargetTemp = data.attributes.temperature;
                callback(null, TargetTemp);
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
    getCurrentState: function(callback){
        this.log('fetching Current Heating Cooling state for: ' + this.name);

        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                if (data.Mode == 'Auto'){
                    var CurrentState = 3;
                } else {
                    var CurrentState = 1;
                }
                callback(null, CurrentState);
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
          .on('get', this.getCurrentState.bind(this)); 

        return [informationService, this.ThermostatService];

     }


}
