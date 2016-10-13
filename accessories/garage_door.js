var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantGarageDoor;
};
module.exports.HomeAssistantGarageDoor = HomeAssistantGarageDoor;

function HomeAssistantGarageDoor(log, data, client, type) {
  // device info
  this.domain = "garage_door"
  this.data = data
  this.entity_id = data.entity_id
  this.uuid_base = data.entity_id
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
  }

  this.client = client
  this.log = log;
}

HomeAssistantGarageDoor.prototype = {
  onEvent: function(old_state, new_state) {
    var garageState = new_state.state == 'open' ? 0 : 1;
    this.garageService.getCharacteristic(Characteristic.CurrentDoorState)
        .setValue(garageState, null, 'internal');
    this.garageService.getCharacteristic(Characteristic.TargetDoorState)
        .setValue(garageState, null, 'internal');
  },
  getGarageDoorState: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        garageState = data.state == 'closed'
        callback(null, garageState)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setGarageDoorState: function(garageOn, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (garageOn) {
      this.log("Setting garage door state on the '"+this.name+"' to closed");

      this.client.callService(this.domain, 'close', service_data, function(data){
        if (data) {
          that.log("Successfully set garage door state on the '"+that.name+"' to closed");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting garage door state on the '"+this.name+"' to open");

      this.client.callService(this.domain, 'open', service_data, function(data){
        if (data) {
          that.log("Successfully set garage door state on the '"+that.name+"' to open");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    this.garageService = new Service.GarageDoorOpener();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Garage Door")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

      this.garageService
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', this.getGarageDoorState.bind(this));
        
      this.garageService
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('get', this.getGarageDoorState.bind(this))
        .on('set', this.setGarageDoorState.bind(this));

    return [informationService, this.garageService];
  }

}
