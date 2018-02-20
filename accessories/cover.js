'use strict';

let Service;
let Characteristic;
let communicationError;

class HomeAssistantCover {
  constructor(log, data, client, firmware) {
    this.client = client;
    this.log = log;
    // device info
    this.domain = 'cover';
    this.data = data;
    this.entity_id = data.entity_id;
    this.uuid_base = data.entity_id;
    this.firmware = firmware;
    if (data.attributes && data.attributes.friendly_name) {
      this.name = data.attributes.friendly_name;
    } else {
      this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }
    if (data.attributes && data.attributes.homebridge_manufacturer) {
      this.manufacturer = String(data.attributes.homebridge_manufacturer);
    } else {
      this.manufacturer = 'Home Assistant';
    }
    if (data.attributes && data.attributes.homebridge_serial) {
      this.serial = String(data.attributes.homebridge_serial);
    } else {
      this.serial = data.entity_id;
    }
    this.batterySource = data.attributes.homebridge_battery_source;
    this.chargingSource = data.attributes.homebridge_charging_source;
  }

  onEvent(oldState, newState) {
    if (newState.state) {
      const state = this.transformData(newState);

      this.service.getCharacteristic(this.stateCharacteristic)
        .setValue(state, null, 'internal');
      this.service.getCharacteristic(this.targetCharacteristic)
        .setValue(state, null, 'internal');
    }
  }

  getState(callback) {
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        callback(null, this.transformData(data));
      } else {
        callback(communicationError);
      }
    });
  }

  getBatteryLevel(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state));
      } else {
        callback(communicationError);
      }
    });
  }
  getChargingState(callback) {
    if (this.batterySource && this.chargingSource) {
      this.client.fetchState(this.chargingSource, (data) => {
        if (data) {
          callback(null, data.state.toLowerCase() === 'charging' ? 1 : 0);
        } else {
          callback(communicationError);
        }
      });
    } else {
      callback(null, 2);
    }
  }
  getLowBatteryStatus(callback) {
    this.client.fetchState(this.batterySource, (data) => {
      if (data) {
        callback(null, parseFloat(data.state) > 20 ? 0 : 1);
      } else {
        callback(communicationError);
      }
    });
  }
  getServices() {
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

    this.service
      .getCharacteristic(this.stateCharacteristic)
      .on('get', this.getState.bind(this));

    this.service
      .getCharacteristic(this.targetCharacteristic)
      .on('get', this.getState.bind(this))
      .on('set', this.setTargetState.bind(this));

    if (this.batterySource) {
      this.batteryService = new Service.BatteryService();
      this.batteryService
        .getCharacteristic(Characteristic.BatteryLevel)
        .setProps({ maxValue: 100, minValue: 0, minStep: 1 })
        .on('get', this.getBatteryLevel.bind(this));
      this.batteryService
        .getCharacteristic(Characteristic.ChargingState)
        .setProps({ maxValue: 2 })
        .on('get', this.getChargingState.bind(this));
      this.batteryService
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', this.getLowBatteryStatus.bind(this));
      return [informationService, this.batteryService, this.service];
    }
    return [informationService, this.service];
  }

  doChangeState(service, callback) {
    const serviceData = {
      entity_id: this.entity_id,
    };

    this.log(`Calling service ${service} on ${this.name}`);

    this.client.callService(this.domain, service, serviceData, (data) => {
      if (data) {
        callback();
      } else {
        callback(communicationError);
      }
    });
  }
}

class HomeAssistantGarageDoor extends HomeAssistantCover {
  constructor(log, data, client, firmware) {
    super(log, data, client, firmware);
    if (data.attributes && data.attributes.homebridge_model) {
      this.model = String(data.attributes.homebridge_model);
    } else {
      this.model = 'Garage Door';
    }
    this.service = new Service.GarageDoorOpener();
    this.stateCharacteristic = Characteristic.CurrentDoorState;
    this.targetCharacteristic = Characteristic.TargetDoorState;
  }

  transformData(data) {
    return data.state === 'closed' ? this.stateCharacteristic.CLOSED : this.stateCharacteristic.OPEN;
  }

  setTargetState(targetState, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    this.doChangeState(targetState === Characteristic.TargetDoorState.CLOSED ? 'close_cover' : 'open_cover', callback);
  }
}

class HomeAssistantRollershutter extends HomeAssistantCover {
  constructor(log, data, client, firmware) {
    super(log, data, client, firmware);
    if (data.attributes && data.attributes.homebridge_model) {
      this.model = String(data.attributes.homebridge_model);
    } else {
      this.model = 'Rollershutter';
    }
    this.service = new Service.WindowCovering();
    this.stateCharacteristic = Characteristic.CurrentPosition;
    this.targetCharacteristic = Characteristic.TargetPosition;
  }

  transformData(data) {
    return (data && data.attributes) ? data.attributes.current_position : null;
  }

  setTargetState(position, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const payload = {
      entity_id: this.entity_id,
      position,
    };

    this.log(`Setting the state of the ${this.name} to ${payload.position}`);

    this.client.callService(this.domain, 'set_cover_position', payload, (data) => {
      if (data) {
        callback();
      } else {
        callback(communicationError);
      }
    });
  }
}

class HomeAssistantRollershutterBinary extends HomeAssistantRollershutter {
  transformData(data) {
    return (data && data.state) ? ((data.state === 'open') * 100) : null;
  }

  setTargetState(position, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    if (!(position === 100 || position === 0)) {
      this.log('Cannot set this cover to positions other than 0 or 100');
      callback(communicationError); // TODO
    } else {
      this.doChangeState(position === 100 ? 'open_cover' : 'close_cover', callback);
    }
  }
}

function HomeAssistantCoverFactory(log, data, client, firmware) {
  if (!data.attributes) {
    return null;
  }

  if (data.attributes.homebridge_cover_type === 'garage_door') {
    return new HomeAssistantGarageDoor(log, data, client, firmware);
  } else if (data.attributes.homebridge_cover_type === 'rollershutter') {
    if (data.attributes.current_position !== undefined) {
      return new HomeAssistantRollershutter(log, data, client, firmware);
    }
    return new HomeAssistantRollershutterBinary(log, data, client, firmware);
  }
  log.error(`'${data.entity_id}' is a cover but does not have a 'homebridge_cover_type' property set. ` +
            'You must set it to either \'rollershutter\' or \'garage_door\' in the customize section ' +
            'of your Home Assistant configuration. It will not be available to Homebridge until you do. ' +
            'See the README.md for more information. ' +
            'The attributes that were found are:', JSON.stringify(data.attributes));
}

function HomeAssistantCoverPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantCoverFactory;
}

module.exports = HomeAssistantCoverPlatform;

module.exports.HomeAssistantCoverFactory = HomeAssistantCoverFactory;
