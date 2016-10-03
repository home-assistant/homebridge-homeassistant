var Service, Characteristic, communicationError;

module.exports = function(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantTemperatureSensor;
};
module.exports.HomeAssistantTemperatureSensor = HomeAssistantTemperatureSensor;

function HomeAssistantTemperatureSensor(log, data, client) {
  // device info
  this.data = data;
  this.entity_id = data.entity_id;
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }

  this.client = client;
}

HomeAssistantTemperatureSensor.prototype = {
  getState: function (callback) {
    this.client.fetchState(this.entity_id, function(data) {
      if(data) {
        callback(null, parseFloat(data.state));
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  getServices: function() {
    this.temperatureService = new Service.TemperatureSensor();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Temperature")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");
      
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on("get", this.getState.bind(this));

    return [informationService, this.temperatureService];
  }

}
