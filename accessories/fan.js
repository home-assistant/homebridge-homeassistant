var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantFan;
};
module.exports.HomeAssistantFan = HomeAssistantFan;

function HomeAssistantFan(log, data, client, type) {
  // device info
  this.domain = type || "fan"
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

HomeAssistantFan.prototype = {
  onEvent: function(old_state, new_state) {
    this.fanService.getCharacteristic(Characteristic.On)
      .setValue(new_state.state == 'on', null, 'internal');
  },
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
  setPowerState: function(powerOn, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (powerOn) {
      this.log("Setting power state on the '"+this.name+"' to on");

      this.client.callService(this.domain, 'turn_on', service_data, function(data){
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to on");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting power state on the '"+this.name+"' to off");

      this.client.callService(this.domain, 'turn_off', service_data, function(data){
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to off");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    this.fanService = new Service.Fan();
    var informationService = new Service.AccessoryInformation();
    var model = "fan";

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, model)
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    this.fanService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

    return [informationService, this.fanService];
  }

}
