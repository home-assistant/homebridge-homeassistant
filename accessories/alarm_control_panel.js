'use strict';

let Service;
let Characteristic;
let communicationError;

function HomeAssistantAlarmControlPanel(log, data, client) {
  // device info
  this.domain = 'alarm_control_panel';
  this.data = data;
  this.entity_id = data.entity_id;
  this.uuid_base = data.entity_id;
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name;
  } else {
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
  }
  if (data.attributes && data.attributes.homebridge_mfg) {
    this.mfg = String(data.attributes.homebridge_mfg);
  } else {
    this.mfg = 'Home Assistant';
  }
  if (data.attributes && data.attributes.homebridge_model) {
    this.model = String(data.attributes.homebridge_model);
  } else {
    this.model = 'Alarm Control Panel';
  }
  if (data.attributes && data.attributes.homebridge_serial) {
    this.serial = String(data.attributes.homebridge_serial);
  } else {
    this.serial = data.entity_id;
  }
  this.client = client;
  this.log = log;
}

HomeAssistantAlarmControlPanel.prototype = {
  onEvent(oldState, newState) {
    let alarmState;
    if (newState.state === 'armed_home') {
      alarmState = 0;
    } else if (newState.state === 'armed_away') {
      alarmState = 1;
    } else if (newState.state === 'armed_night') {
      alarmState = 2;
    } else if (newState.state === 'disarmed') {
      alarmState = 3;
    } else if (newState.state === 'triggered') {
      alarmState = 4;
    } else {
      alarmState = 3;
    }
    this.alarmService.getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .setValue(alarmState, null, 'internal');
    this.alarmService.getCharacteristic(Characteristic.SecuritySystemTargetState)
        .setValue(alarmState, null, 'internal');
  },
  getAlarmState(callback) {
    this.client.fetchState(this.entity_id, (data) => {
      if (data) {
        if (data.state === 'armed_home') {
          callback(null, 0);
        } else if (data.state === 'armed_away') {
          callback(null, 1);
        } else if (data.state === 'armed_night') {
          callback(null, 2);
        } else if (data.state === 'disarmed') {
          callback(null, 3);
        } else if (data.state === 'triggered') {
          callback(null, 4);
        } else {
          callback(null, 3);
        }
      } else {
        callback(communicationError);
      }
    });
  },

  setAlarmState(targetState, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    const that = this;
    const serviceData = {};
    serviceData.entity_id = this.entity_id;

    if (targetState === Characteristic.SecuritySystemCurrentState.STAY_ARM) {
      this.log(`Setting alarm state on the '${this.name}' to armed stay`);

      this.client.callService(this.domain, 'alarm_arm_home', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set alarm state on the '${that.name}' to armed stay`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else if (targetState === Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
      this.log(`Setting alarm state on the '${this.name}' to armed stay`);

      this.client.callService(this.domain, 'alarm_arm_away', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set alarm state on the '${that.name}' to armed away`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else if (targetState === Characteristic.SecuritySystemCurrentState.NIGHT_ARM) {
      this.log(`Setting alarm state on the '${this.name}' to armed night`);

      this.client.callService(this.domain, 'alarm_arm_home', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set alarm state on the '${that.name}' to armed night`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else if (targetState === Characteristic.SecuritySystemCurrentState.DISARMED) {
      this.log(`Setting alarm state on the '${this.name}' to disarmed`);

      this.client.callService(this.domain, 'alarm_disarm', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set alarm state on the '${that.name}' to disarmed`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    } else {
      this.log(`Setting alarm state on the '${this.name}' to disarmed`);

      this.client.callService(this.domain, 'alarm_disarm', serviceData, (data) => {
        if (data) {
          that.log(`Successfully set alarm state on the '${that.name}' to disarmed`);
          callback();
        } else {
          callback(communicationError);
        }
      });
    }
  },
  getServices() {
    this.alarmService = new Service.SecuritySystem();
    const informationService = new Service.AccessoryInformation();

    informationService
          .setCharacteristic(Characteristic.Manufacturer, this.mfg)
          .setCharacteristic(Characteristic.Model, this.model)
          .setCharacteristic(Characteristic.SerialNumber, this.serial);

    this.alarmService
        .getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .on('get', this.getAlarmState.bind(this));

    this.alarmService
        .getCharacteristic(Characteristic.SecuritySystemTargetState)
        .on('get', this.getAlarmState.bind(this))
        .on('set', this.setAlarmState.bind(this));

    return [informationService, this.alarmService];
  },

};

function HomeAssistantAlarmControlPanelPlatform(oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantAlarmControlPanel;
}

module.exports = HomeAssistantAlarmControlPanelPlatform;
module.exports.HomeAssistantAlarmControlPanel = HomeAssistantAlarmControlPanel;
