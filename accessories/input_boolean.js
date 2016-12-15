var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantInputBoolean;
};
module.exports.HomeAssistantInputBoolean = HomeAssistantInputBoolean;

function HomeAssistantInputBoolean(log, data, client) {
  // device info
  this.domain = "input_boolean"
  this.data = data
  this.entity_id = data.entity_id
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
  }

  this.client = client
  this.log = log;
}

HomeAssistantInputBoolean.prototype = {
  getPowerState: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        powerState = data.state == 'on'
        callback(null, powerState)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setPowerState: function(powerOn, callback) {
    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (powerOn) {
      this.log("Setting state on the '"+this.name+"' to on");

      this.client.callService(this.domain, 'turn_on', service_data, function(data){
        if (data) {
          that.log("Successfully set state on the '"+that.name+"' to on");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting state on the '"+this.name+"' to off");

      this.client.callService(this.domain, 'turn_off', service_data, function(data){
        if (data) {
          that.log("Successfully set state on the '"+that.name+"' to off");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    var switchService = new Service.Switch();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Switch")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

      switchService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    return [informationService, switchService];
  }

}

