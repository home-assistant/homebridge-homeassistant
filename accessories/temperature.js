var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantTemperature;
};
module.exports.HomeAssistantTemperature = HomeAssistantTemperature;

function HomeAssistantTemperature(log, data, client) {
  // device info
  this.data = data
  this.entity_id = data.entity_id
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
  }

  this.entity_type = data.entity_id.split('.')[0]

  this.client = client
  this.log = log;
}

HomeAssistantTemperature.prototype = {
  temperatureFromData: function(data) {
    value = parseFloat(data.state)
    // HomeKit only works with Celsius internally
    if (data.attributes.unit_of_measurement == '°F') {
      value = (value - 32) / 1.8
    }
    return value
  },
  onEvent: function(old_state, new_state) {
    this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
      .setValue(this.temperatureFromData(new_state), null, 'internal')
  },
  identify: function(callback){
    this.log("identifying: " + this.name);
    callback();
  },
  getTemperature: function(callback){
    this.log("fetching temperature for: " + this.name);
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        callback(null, this.temperatureFromData(data))
      }else{
        callback(communicationError)
      } 
    }.bind(this))
  },
  getServices: function() {
    this.temperatureService = new Service.TemperatureSensor();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Thermometer")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getTemperature.bind(this))

    return [informationService, this.temperatureService];
  }

}
