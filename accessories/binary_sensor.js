var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantBinarySensor;
};
module.exports.HomeAssistantBinarySensor = HomeAssistantBinarySensor;

function HomeAssistantBinarySensor(log, data, client, service, characteristic, onValue, offValue) {
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

  this.service = service
  this.characteristic = characteristic
  this.onValue = onValue
  this.offValue = offValue
}

HomeAssistantBinarySensor.prototype = {
  onEvent: function(old_state, new_state) {
    this.sensorService.getCharacteristic(this.characteristic)
      .setValue(new_state.state == "on" ? this.onValue : this.offValue, null, 'internal')
  },
  identify: function(callback){
    this.log("identifying: " + this.name);
    callback();
  },
  getState: function(callback){
    this.log("fetching state for: " + this.name);
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        callback(null, data.state == "on" ? this.onValue : this.offValue)
      }else{
        callback(communicationError)
      } 
    }.bind(this))
  },
  getServices: function() {
    this.sensorService = new this.service()
    this.sensorService
      .getCharacteristic(this.characteristic)
      .on('get', this.getState.bind(this))
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Binary Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    return [informationService, this.sensorService];
  }

}
