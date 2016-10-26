var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantBinarySensorFactory;
};
module.exports.HomeAssistantBinarySensorFactory = HomeAssistantBinarySensorFactory;

function HomeAssistantBinarySensorFactory(log, data, client) {
  if (!(data.attributes && data.attributes.sensor_class)) {
    return null;
  }
  switch(data.attributes.sensor_class) {
    case 'moisture':
      return new HomeAssistantBinarySensor(log, data, client,
          Service.LeakSensor,
          Characteristic.LeakDetected,
          Characteristic.LeakDetected.LEAK_DETECTED,
          Characteristic.LeakDetected.LEAK_NOT_DETECTED);
    case 'motion':
      return new HomeAssistantBinarySensor(log, data, client,
          Service.MotionSensor,
          Characteristic.MotionDetected,
          true,
          false);
    case 'occupancy':
      return new HomeAssistantBinarySensor(log, data, client,
          Service.OccupancySensor,
          Characteristic.OccupancyDetected,
          Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
          Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    case 'opening':
      return new HomeAssistantOpening(log, data, client);
    case 'smoke':
      return new HomeAssistantBinarySensor(log, data, client,
          Service.SmokeSensor,
          Characteristic.SmokeDetected,
          Characteristic.SmokeDetected.SMOKE_DETECTED,
          Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    default:
      return null;
  }
}

class HomeAssistantBinarySensor {
  constructor(log, data, client, service, characteristic, onValue, offValue) {
    // device info
    this.data = data;
    this.entity_id = data.entity_id;
    if (data.attributes && data.attributes.friendly_name) {
      this.name = data.attributes.friendly_name;
    } else {
      this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }
  
    this.entity_type = data.entity_id.split('.')[0];
  
    this.client = client;
    this.log = log;

    this.service = service;
    this.characteristic = characteristic;
    this.onValue = onValue;
    this.offValue = offValue;
  }

  onEvent(old_state, new_state) {
    this.sensorService.getCharacteristic(this.characteristic)
      .setValue(new_state.state == "on" ? this.onValue : this.offValue, null, 'internal');
  }
  identify(callback) {
    this.log("identifying: " + this.name);
    callback();
  }
  getState(callback) {
    this.log("fetching state for: " + this.name);
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        callback(null, data.state == "on" ? this.onValue : this.offValue);
      } else {
        callback(communicationError);
      } 
    }.bind(this));
  }
  getServices() {
    this.sensorService = new this.service();
    this.sensorService
      .getCharacteristic(this.characteristic)
      .on('get', this.getState.bind(this));
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Binary Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    return [informationService, this.sensorService];
  }
}

class HomeAssistantOpening extends HomeAssistantBinarySensor {
  constructor(log, data, client) {
    super(log, data, client);
    if (data.attributes.homebridge_opening_type && data.attributes.homebridge_opening_type == 'window') {
      this.service = Service.Window;
    } else {
      this.service = Service.Door;
    }
    this.characteristic = Characteristic.CurrentPosition;
    this.onValue = 100;
    this.offValue = 0;
  }
  onEvent(old_state, new_state) {
    super.onEvent(old_state, new_state);
    this.sensorService.getCharacteristic(Characteristic.TargetPosition)
      .setValue(new_state == "on" ? this.onValue : this.offValue);
    this.sensorService.getCharacteristic(Characteristic.PositionState)
      .setValue(Characteristic.PositionState.STOPPED);
  }
  getPositionState(callback) {
    callback(null, Characteristic.PositionState.STOPPED);
  }
  getServices() {
    var services = super.getServices();
    this.sensorService
      .getCharacteristic(Characteristic.PositionState)
      .on('get', this.getPositionState.bind(this));

    this.sensorService
      .getCharacteristic(Characteristic.TargetPosition)
      .on('get', this.getState.bind(this));

    return services;
  }
}
