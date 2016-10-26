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
    this.name = data.entity_id.split(".").pop().replace(/_/g, " ")
  }
  if (data.attributes && data.attributes.homebridge_cover_type && (
    data.attributes.homebridge_cover_type === "rollershutter" ||
    data.attributes.homebridge_cover_type === "garage_door"
  )) {
    this.cover_type = data.attributes.homebridge_cover_type;
  } else {
    throw new Error("You must provide the `homebridge_cover_type\" property " +
                    "in the customise section of your Home Assistant config. " +
                    "Set it to either `rollershutter\" or `garage_door\".");
  }

  this.client = client
  this.log = log;
}

HomeAssistantCover.prototype = {
  onEvent: function(old_state, new_state) {
    var coverState = new_state.attributes.current_position == 100 ? 0 : 1;
    this.coverService.getCharacteristic(Characteristic.CurrentDoorState)
        .setValue(coverState, null, "internal");
    this.coverService.getCharacteristic(Characteristic.TargetDoorState)
        .setValue(coverState, null, "internal");
  },
  getCoverState: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        coverState = data.state == "closed"
        callback(null, coverState)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setCoverState: function(coverOn, callback, context) {
    if (context == "internal") {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (coverOn) {
      this.log("Setting cover state on the "+this.name+" to closed");

      this.client.callService(this.domain, "close_cover", service_data, function(data){
        if (data) {
          that.log("Successfully set cover state on the "+that.name+" to closed");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting cover state on the "+this.name+" to open");

      this.client.callService(this.domain, "open_cover", service_data, function(data){
        if (data) {
          that.log("Successfully set cover state on the "+that.name+" to open");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
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

    this.log("Setting the state of the "+this.name+" to "+ data.position);

    this.client.callService(this.domain, "set_cover_position", data, function(data){
      if (data) {
        that.log("Successfully set position of "+that.name+" to "+ data.position);
        callback()
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getServices: function() {
    this.coverService = (this.cover_type === "garage_door") ? new Service.GarageDoorOpener() : new Service.WindowCovering();
    this.model = (this.cover_type === "garage_door") ? "Garage Door" : "Rollershutter";
    this.stateCharacteristic = (this.cover_type === "garage_door") ? Characteristic.CurrentDoorState : Characteristic.TargetDoorState;
    this.targetCharacteristic = (this.cover_type === "garage_door") ? Characteristic.TargetDoorState : Characteristic.TargetPosition;
    this.stateCharacteristicGetFunction = (this.cover_type === "garage_door") ? this.getCoverState : this.getPosition;
    this.targetCharacteristicGetFunction = (this.cover_type === "garage_door") ? this.getCoverState : this.getPosition;
    this.targetCharacteristicSetFunction = (this.cover_type === "garage_door") ? this.setCoverState : this.setPosition;

    var informationService = new Service.AccessoryInformation();
    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
        .setCharacteristic(Characteristic.SerialNumber, "xxx")
        .setCharacteristic(Characteristic.Model, this.model);

    this.coverService
      .getCharacteristic(this.stateCharacteristic)
      .on("get", this.stateCharacteristicGetFunction.bind(this));

    this.coverService
      .getCharacteristic(this.targetCharacteristic)
      .on("get", this.targetCharacteristicGetFunction.bind(this))
      .on("set", this.targetCharacteristicSetFunction.bind(this));

    return [informationService, this.coverService];
  }

}
