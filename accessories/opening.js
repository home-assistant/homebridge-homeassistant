var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  var HomeAssistantBinarySensor = require('./binary_sensor')(Service, Characteristic, communicationError)
  class HomeAssistantOpening extends HomeAssistantBinarySensor {
    constructor(log, data, client) {
      super(log, data, client)
      if (entity.attributes.homebridge_opening_type && entity.attributes.homebridge_opening_type == 'window') {
        this.service = Service.Window;
      } else {
        this.service = Service.Door;
      }
      this.characteristic = Characteristic.CurrentPosition
      this.onValue = 100
      this.offValue = 0
    }
    onEvent(old_state, new_state) {
      super.onEvent(old_state, new_state)
      this.sensorService.getCharacteristic(Characteristic.TargetPosition)
        .setValue(new_state == "on" ? this.onValue : this.offValue)
      this.sensorService.getCharacteristic(Characteristic.PositionState)
        .setValue(Characteristic.PositionState.STOPPED)
    }
    getPositionState(callback) {
      callback(null, Characteristic.PositionState.STOPPED)
    }
    getServices() {
      var services = super.getServices()
      this.sensorService
        .getCharacteristic(Characteristic.PositionState)
        .on('get', this.getPositionState.bind(this))

      this.sensorService
        .getCharacteristic(Characteristic.TargetPosition)
        .on('get', this.getState.bind(this))

      return services
    }
  }

  this.HomeAssistantOpening = HomeAssistantOpening;

  return HomeAssistantOpening;
};
