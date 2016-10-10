var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantCover;
};
module.exports.HomeAssistantCover = HomeAssistantCover;

function HomeAssistantCover(log, data, client) {
  // device info
  this.domain = "cover"
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

HomeAssistantCover.prototype = {
  getPosition: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data && data.attributes) {
        callback(null, data.attributes.current_position)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setPosition: function(position, callback, context) {
    var that = this;
    var data = {
      entity_id: this.entity_id,
      position: position
    };

    this.log("Setting the state of the '"+this.name+"' to "+ data.position);

    this.client.callService(this.domain, 'set_cover_position', data, function(data){
      if (data) {
        that.log("Successfully set position of '"+that.name+"' to "+ data.position);
        callback()
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getServices: function() {
    this.coverService = new Service.WindowCovering();
    var informationService = new Service.AccessoryInformation();
    var model;

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Cover")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    this.coverService
      .getCharacteristic(Characteristic.CurrentPosition)
      .on('get', this.getPosition.bind(this));

    this.coverService
      .getCharacteristic(Characteristic.TargetPosition)
      .on('get', this.getPosition.bind(this))
      .on('set', this.setPosition.bind(this));

    return [informationService, this.coverService];
  }
}
