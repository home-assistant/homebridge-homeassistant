var Service, Characteristic, communicationError;

module.exports = function (oService, oCharacteristic, oCommunicationError) {
  Service = oService;
  Characteristic = oCharacteristic;
  communicationError = oCommunicationError;

  return HomeAssistantLight;
};
module.exports.HomeAssistantLight = HomeAssistantLight;

function HomeAssistantLight(log, data, client) {
  // device info
  this.domain = "light";
  this.data = data;
  this.entity_id = data.entity_id;
  this.uuid_base = data.entity_id;
  if (data.attributes && data.attributes.friendly_name) {
    this.name = data.attributes.friendly_name
  }else{
    this.name = data.entity_id.split('.').pop().replace(/_/g, ' ')
  }

  this.client = client;
  this.log = log;
}

HomeAssistantLight.prototype = {
  features: Object.freeze({
    BRIGHTNESS: 1,
    COLOR_TEMP: 2,
    EFFECT: 4,
    FLASH: 8,
    RGB_COLOR: 16,
    TRANSITION: 32,
    XY_COLOR: 64,
  }),
  is_supported: function(feature) {
    // If the supported_features attribute doesn't exist, assume supported
    return this.data.attributes.supported_features === undefined ||
        ((this.data.attributes.supported_features & feature) > 0);
  },
  onEvent: function(old_state, new_state) {
    this.lightbulbService.getCharacteristic(Characteristic.On)
        .setValue(new_state.state == 'on', null, 'internal');
    if (this.is_supported(this.features.BRIGHTNESS)) {
      var brightness = Math.round(((new_state.attributes.brightness || 0) / 255) * 100);

      this.lightbulbService.getCharacteristic(Characteristic.Brightness)
          .setValue(brightness, null, 'internal');

      this.data.attributes.brightness = brightness;
    }

    if (this.is_supported(this.features.RGB_COLOR) && new_state.attributes.rgb_color !== undefined) {
      var rgbColor = new_state.attributes.rgb_color;
      var hsv = LightUtil.rgbToHsv(rgbColor[0], rgbColor[1], rgbColor[2]);
      var hue = hsv.h * 360;
      var saturation = hsv.s * 100;

      this.log("OnEvent:");
      this.log("RGB color:");
      this.log(new_state.attributes.rgb_color);
      this.log("HSV color:");
      this.log(hsv);


      this.lightbulbService.getCharacteristic(Characteristic.Hue)
          .setValue(hue, null, 'internal');
      this.lightbulbService.getCharacteristic(Characteristic.Saturation)
          .setValue(saturation, null, 'internal');

      this.data.attributes.hue = hue;
      this.data.attributes.saturation = saturation;
    }
  },
  identify: function(callback) {
    this.log("identifying: " + this.name);

    var that = this;
    var service_data = {};
    service_data.entity_id = this.entity_id;
    service_data.flash = 'short';

    this.client.callService(this.domain, 'turn_on', service_data, function(data) {
      if (data) {
        that.log("Successfully identified '" + that.name + "'");
      }
      callback();
    }.bind(this));
  },
  getPowerState: function(callback) {
    this.log("fetching power state for: " + this.name);

    this.client.fetchState(this.entity_id, function(data) {
      if (data) {
        powerState = data.state == 'on';
        callback(null, powerState);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  getBrightness: function(callback) {
    this.log("fetching brightness for: " + this.name);

    this.client.fetchState(this.entity_id, function(data) {
      if (data && data.attributes) {
        var brightness = ((data.attributes.brightness || 0) / 255) * 100;
        callback(null, brightness);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  getHue: function(callback) {
    this.log("fetching hue for: " + this.name);

    var that = this;
    this.client.fetchState(this.entity_id, function(data) {
      if (data && data.attributes && data.attributes.rgb_color) {

        var rgb = data.attributes.rgb_color;
        var hsv = LightUtil.rgbToHsv(rgb[0], rgb[1], rgb[2]);

        var hue = hsv.h * 360;
        that.data.attributes.hue = hue;

        callback(null, hue);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  getSaturation: function(callback) {
    this.log("fetching saturation for: " + this.name);

    var that = this;
    this.client.fetchState(this.entity_id, function(data) {
      if (data && data.attributes && data.attributes.rgb_color) {

        var rgb = data.attributes.rgb_color;
        var hsv = LightUtil.rgbToHsv(rgb[0], rgb[1], rgb[2]);

        var saturation = hsv.s * 100;
        that.data.attributes.saturation = saturation;

        callback(null, saturation);
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  setPowerState: function(powerOn, callback, context) {
    if (context == 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {};
    service_data.entity_id = this.entity_id;

    if (powerOn) {
      this.log("Setting power state on the '"+this.name+"' to on");

      this.client.callService(this.domain, 'turn_on', service_data, function(data) {
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to on");
          callback();
        } else {
          callback(communicationError);
        }
      }.bind(this));
    } else {
      this.log("Setting power state on the '"+this.name+"' to off");

      this.client.callService(this.domain, 'turn_off', service_data, function(data) {
        if (data) {
          that.log("Successfully set power state on the '"+that.name+"' to off");
          callback();
        } else {
          callback(communicationError);
        }
      }.bind(this));
    }
  },
  setBrightness: function(level, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {};
    service_data.entity_id = this.entity_id;

    service_data.brightness = 255 * (level / 100.0);
    that.data.attributes.brightness = service_data.brightness;

    this.log("Setting brightness on the '" + this.name + "' to " + level);

    this.client.callService(this.domain, 'turn_on', service_data, function(data) {
      if (data) {
        that.log("Successfully set brightness on the '" + that.name + "' to " + level);
        callback();
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  setHue: function(level, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {};
    service_data.entity_id = this.entity_id;
    that.data.attributes.hue = level;

    this.log("Setting hue");
    this.log("Color values from HomeKit: ");
    this.log(this.data.attributes);

    this.client.callService(this.domain, 'turn_on', service_data, function (data) {
      if (data) {
        that.log("Successfully set hue on the '" + that.name + "' to " + level);
        callback();
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  setSaturation: function(level, callback, context) {
    if (context === 'internal') {
      callback();
      return;
    }

    var that = this;
    var service_data = {};
    service_data.entity_id = this.entity_id;

    this.data.attributes.saturation = level;

    var rgb = LightUtil.hsvToRgb(
        (this.data.attributes.hue || 0) / 360,
        (this.data.attributes.saturation || 0) / 100,
        (this.data.attributes.brightness || 0) / 100
    );
    service_data.rgb_color = [rgb.r, rgb.g, rgb.b];

    this.log("Setting saturation");
    this.log("Color values from HomeKit: ");
    this.log(this.data.attributes);

    this.client.callService(this.domain, 'turn_on', service_data, function(data) {
      if (data) {
        that.log("Successfully set rgb on the '" + that.name + "' to " + service_data.rgb_color);
        callback();
      } else {
        callback(communicationError);
      }
    }.bind(this));
  },
  getServices: function() {
    this.lightbulbService = new Service.Lightbulb();
    var informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Home Assistant")
        .setCharacteristic(Characteristic.Model, "Light")
        .setCharacteristic(Characteristic.SerialNumber, this.entity_id);

    this.lightbulbService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    if (this.is_supported(this.features.BRIGHTNESS)) {
      this.lightbulbService
          .addCharacteristic(Characteristic.Brightness)
          .on('get', this.getBrightness.bind(this))
          .on('set', this.setBrightness.bind(this));
    }

    if (this.is_supported(this.features.RGB_COLOR)) {
      this.lightbulbService
          .addCharacteristic(Characteristic.Hue)
          .on('get', this.getHue.bind(this))
          .on('set', this.setHue.bind(this));

      this.lightbulbService
          .addCharacteristic(Characteristic.Saturation)
          .on('get', this.getSaturation.bind(this))
          .on('set', this.setSaturation.bind(this));
    }

    return [informationService, this.lightbulbService];
  }
};

var LightUtil = {
  hsvToRgb: function(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
      s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  },
  rgbToHsv: function(r, g, b) {
    if (arguments.length === 1) {
      g = r.g, b = r.b, r = r.r;
    }
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
      case min: h = 0; break;
      case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
      case g: h = (b - r) + d * 2; h /= 6 * d; break;
      case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {
      h: h,
      s: s,
      v: v
    };
  }
};