var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
    Service = oService;
    Characteristic = oCharacteristic;
    communicationError = oCommunicationError;

    return HomeAssistantLock;
};
module.exports.HomeAssistantLock = HomeAssistantLock;

function HomeAssistantLock(log, data, client) {
    // device info
    this.domain = 'lock';
    this.data = data;
    this.entity_id = data.entity_id;
    this.uuid_base = data.entity_id;
    if (data.attributes && data.attributes.friendly_name) {
        this.name = data.attributes.friendly_name;
    } else {
        this.name = data.entity_id.split('.').pop().replace(/_/g, ' ');
    }

    this.client = client;
    this.log = log;
}

HomeAssistantLock.prototype = {
    onEvent: function(old_state, new_state) {
        var lockState = new_state.state == 'unlocked' ? 0 : 1;
        this.lockService.getCharacteristic(Characteristic.LockCurrentState)
          .setValue(lockState, null, 'internal');
        this.lockService.getCharacteristic(Characteristic.LockTargetState)
          .setValue(lockState, null, 'internal');
    },
    getLockState: function(callback){
        this.client.fetchState(this.entity_id, function(data){
            if (data) {
                var lockState = data.state == 'locked';
                callback(null, lockState);
            } else {
                callback(communicationError);
            }
        }.bind(this));
    },
    setLockState: function(lockOn, callback, context) {
        if (context == 'internal') {
            callback();
            return;
        }

        var that = this;
        var service_data = {};
        service_data.entity_id = this.entity_id;

        if (lockOn) {
            this.log('Setting lock state on the \''+this.name+'\' to locked');

            this.client.callService(this.domain, 'lock', service_data, function(data){
                if (data) {
                    that.log('Successfully set lock state on the \''+that.name+'\' to locked');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        } else {
            this.log('Setting lock state on the \''+this.name+'\' to unlocked');

            this.client.callService(this.domain, 'unlock', service_data, function(data){
                if (data) {
                    that.log('Successfully set lock state on the \''+that.name+'\' to unlocked');
                    callback();
                } else {
                    callback(communicationError);
                }
            }.bind(this));
        }
    },
    getServices: function() {
        this.lockService = new Service.LockMechanism();
        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Home Assistant')
          .setCharacteristic(Characteristic.Model, 'Lock')
          .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

        this.lockService
          .getCharacteristic(Characteristic.LockCurrentState)
          .on('get', this.getLockState.bind(this));

        this.lockService
          .getCharacteristic(Characteristic.LockTargetState)
          .on('get', this.getLockState.bind(this))
          .on('set', this.setLockState.bind(this));

        return [informationService, this.lockService];
    }

};
