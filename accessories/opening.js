var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  var HomeAssistantBinarySensor = require('./binary_sensor')(Service, Characteristic, communicationError)
  class HomeAssistantOpening extends HomeAssistantBinarySensor {
    constructor(log, data, client, service) {
      super(log, data, client, service, Characteristic.CurrentPosition, 100, 0)
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
