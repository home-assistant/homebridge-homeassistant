var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantBinarySensor;
};

class HomeAssistantBinarySensor {
  constructor(log, data, client) {
    // device info
    this.data = data
    this.entity_id = data.entity_id
    if (data.attributes && data.attributes.friendly_name) {
      this.name = data.attributes.friendly_name
    } else {
      this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
    }
  
    this.entity_type = data.entity_id.split('.')[0]
  
    this.client = client
    this.log = log;

    switch(data.attributes.sensor_class) {
      case 'moisture':
        this.service = Service.LeakSensor
        this.characteristic = Characteristic.LeakDetected
        this.onValue = Characteristic.LeakDetected.LEAK_DETECTED
        this.offValue = Characteristic.LeakDetected.LEAK_NOT_DETECTED
        break
      case 'motion':
        this.service = Service.MotionSensor
        this.characteristic = Characteristic.MotionDetected
        this.onValue = true
        this.offValue = false
        break
      case 'occupancy':
        this.service = Service.OccupancySensor
        this.characteristic = Characteristic.OccupancyDetected
        this.onValue = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
        this.offValue = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED
        break
      case 'opening':
        // Handled by subclass
        break
      case 'smoke':
        this.service = Service.SmokeSensor
        this.characteristic = Characteristic.SmokeDetected
        this.onValue = Characteristic.SmokeDetected.SMOKE_DETECTED
        this.offValue = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
        break
      default:
        return null
    }
  }

  onEvent(old_state, new_state) {
    this.sensorService.getCharacteristic(this.characteristic)
      .setValue(new_state.state == "on" ? this.onValue : this.offValue, null, 'internal')
  }
  identify(callback){
    this.log("identifying: " + this.name);
    callback();
  }
  getState(callback){
    this.log("fetching state for: " + this.name);
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        callback(null, data.state == "on" ? this.onValue : this.offValue)
      } else {
        callback(communicationError)
      } 
    }.bind(this))
  }
  getServices() {
    this.sensorService = new this.service()
    this.sensorService
      .getCharacteristic(this.characteristic)
      .on('get', this.getState.bind(this))
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Binary Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    return [informationService, this.sensorService];
  }
}

module.exports.HomeAssistantBinarySensor = HomeAssistantBinarySensor;

