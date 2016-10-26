var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantRollershutter;
};
module.exports.HomeAssistantRollershutter = HomeAssistantRollershutter;

function HomeAssistantRollershutter(log, data, client) {
  // device info
  this.domain = "rollershutter"
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

HomeAssistantRollershutter.prototype = {
  onEvent: function(old_state, new_state) {
    /* See getOpenState() for details on these values */
    var state = new_state.attributes.current_position == 100 ? 1 : 0;
    this.rollershutterService.getCharacteristic(Characteristic.CurrentDoorState)
      .setValue(state, null, 'internal');
    this.rollershutterService.getCharacteristic(Characteristic.TargetDoorState)
      .setValue(state, null, 'internal');
  },
  getOpenState: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data && data.attributes) {

        // if rollershutter state == 'open' then the door is closed ie you can't walk through it
        // rollershutter "closed" means the rollershutter itself is closed (rolled up), so the door is open
        // see discussion at https://github.com/home-assistant/home-assistant-polymer/pull/54

        // HomeKit door states: 0 is open, 1 is closed
        // https://github.com/KhaosT/HAP-NodeJS/blob/621d188bc9799c631d763c75aafdd7f4a7ee8ba3/lib/gen/HomeKitTypes.js#L443
        if (data.attributes.current_position == 100) {
            // Rollershutter is fully unrolled / doorway or window is closed
            openState = 1
        } else {
            // Consider doorway open if rollershutter is not fully open
            openState = 0
        }
        callback(null, openState)
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setOpenState: function(rollershutterCommand, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    // Open is 0 / false
    if (!rollershutterCommand) {
      this.log("Setting the state of the '"+this.name+"' to open");

      this.client.callService(this.domain, 'move_up', service_data, function(data){
        if (data) {
          that.log("Successfully set state of '"+that.name+"' to open");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }else{
      this.log("Setting the state of the '"+this.name+"' to closed");

      this.client.callService(this.domain, 'move_down', service_data, function(data){
        if (data) {
          that.log("Successfully set state of '"+that.name+"' to closed");
          callback()
        }else{
          callback(communicationError)
        }
      }.bind(this))
    }
  },
  getServices: function() {
    this.rollershutterService = new Service.GarageDoorOpener();
    var informationService = new Service.AccessoryInformation();
    var model;

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Rollershutter")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    this.rollershutterService
      .getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', this.getOpenState.bind(this));

    this.rollershutterService
      .getCharacteristic(Characteristic.TargetDoorState)
      .on('get', this.getOpenState.bind(this))
      .on('set', this.setOpenState.bind(this));

    return [informationService, this.rollershutterService];
  }
}
