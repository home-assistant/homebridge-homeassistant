var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantFan;
};
module.exports.HomeAssistantFan = HomeAssistantFan;

function HomeAssistantFan(log, data, client) {
  // device info
  this.domain = "fan"
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
  getRotationSpeed: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        if (data.state == 'off') {
          callback(null, 0);
        } else {
          switch (data.attributes.speed) {
            case "low":
              callback(null, 25);
            case "med", "medium":
              callback(null, 50);
            case "high":
              callback(null, 100);
          }
        }
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setRotationSpeed: function(speed, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    this.log("Received a fan speed of"+speed)

    if (speed >= 0 && speed <= 25) {
      this.log("Setting fan low")
      service_data.speed = "low";
    } else if (speed >= 25 && speed <= 75) {
      this.log("Setting fan med")
      service_data.speed = "med";
    } else if (speed >= 75 && speed <= 100) {
      this.log("Setting fan high")
      service_data.speed = "high";
    }

    this.log("Setting speed on the '"+this.name+"' to "+service_data.speed);

    this.client.callService(this.domain, 'set_speed', service_data, function(data){
      if (data) {
        that.log("Successfully set power state on the '"+that.name+"' to on");
        callback()
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getRotationSpeed: function(callback){
    this.client.fetchState(this.entity_id, function(data){
      if (data) {
        if (data.state == 'off') {
          callback(null, 0);
        } else {
          switch (data.attributes.speed) {
            case "low":
              callback(null, 33);
              break;
            case "med", "medium":
              callback(null, 66);
              break;
            case "high":
              callback(null, 100);
              break;
          }
        }
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  setRotationSpeed: function(speed, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {}
    service_data.entity_id = this.entity_id

    if (speed >= 0 && speed < 33) {
      service_data.speed = "low";
    } else if (speed >= 33 && speed < 66) {
      service_data.speed = "med";
    } else if (speed >= 66 && speed <= 100) {
      service_data.speed = "high";
    }

    this.log("Setting speed on the '"+this.name+"' to "+service_data.speed);

    this.client.callService(this.domain, 'set_speed', service_data, function(data){
      if (data) {
        that.log("Successfully set power state on the '"+that.name+"' to on");
        callback()
      }else{
        callback(communicationError)
      }
    }.bind(this))
  },
  getServices: function() {
    this.fanService = new Service.Fan();
    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
      .setCharacteristic(Characteristic.Model, "Fan")
      .setCharacteristic(Characteristic.SerialNumber, "xxx");

    this.fanService
      .getCharacteristic(Characteristic.On)
      .on('get', this.getPowerState.bind(this))
      .on('set', this.setPowerState.bind(this));

    this.fanService
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getRotationSpeed.bind(this))
      .on('set', this.setRotationSpeed.bind(this));

    return [informationService, this.fanService];
  }

}
