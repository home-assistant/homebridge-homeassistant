var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantCover;
};
module.exports.HomeAssistantCover = HomeAssistantCover;

function HomeAssistantCover(log, data, client, type) {
  // device info
  this.domain = "cover"
  this.data = data
  this.entity_id = data.entity_id
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
  }
  if (data.attributes && data.attributes.homebridge_cover_type && (
    data.attributes.homebridge_cover_type === 'rollershutter' ||
    data.attributes.homebridge_cover_type === 'garage_door'
  )) {
    this.cover_type = data.attributes.homebridge_cover_type;
  } else {
    throw new Error('You must provide the `homebridge_cover_type\' property ' +
                    'in the customise section of your Home Assistant config. ' +
                    'Set it to either `rollershutter\' or `garage_door\'.');
  }

  this.client = client
  this.log = log;
}

HomeAssistantCover.prototype = {
  onEvent: function(old_state, new_state) {
    var coverState = new_state.attributes.current_position == 100 ? 0 : 1;
    this.coverService.getCharacteristic(Characteristic.CurrentDoorState)
        .setValue(coverState, null, 'internal');
    this.coverService.getCharacteristic(Characteristic.TargetDoorState)
        .setValue(coverState, null, 'internal');
  },
  getCoverState: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        coverState = data.state == 'closed'
        callback(null, coverState)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setCoverState: function(coverOn, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (coverOn) {
      this.log("Setting cover state on the '"+this.name+"' to closed");

      this.client.callService(this.domain, 'close_cover', service_data, function(data){
        if (data) {
          that.log("Successfully set cover state on the '"+that.name+"' to closed");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting cover state on the '"+this.name+"' to open");

      this.client.callService(this.domain, 'open_cover', service_data, function(data){
        if (data) {
          that.log("Successfully set cover state on the '"+that.name+"' to open");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    this.coverService = new Service.GarageDoorOpener();

    var informationService = new Service.AccessoryInformation();
    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
        .setCharacteristic(Characteristic.SerialNumber, "xxx");
    if(this.cover_type === 'garage_door') {
        informationService.setCharacteristic(Characteristic.Model, "Garage Door");
    } else {
        informationService.setCharacteristic(Characteristic.Model, "Rollershutter");
    }

      this.coverService
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', this.getCoverState.bind(this));

      this.coverService
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('get', this.getCoverState.bind(this))
        .on('set', this.setCoverState.bind(this));

    return [informationService, this.coverService];
  }

}
