
# Home Assistant for Homebridge

Control your accessories from [Home Assistant](http://home-assistant.io) with
Siri and HomeKit. Set it up and poof, all of your supported accessories will be
instantly controllable via Siri.

## Device Support

Home Assistant is a home automation platform already, so this plugin aims to
just expose your devices in a way that you can control them with Siri. While
you can integrate your accessories into HomeKit for automations, the goals of
this plugin are strictly to allow Siri to be a frontend for your accessories.

When you set up the Home Assistant plugin, all you have to do is point it at
your Home Assistant server. The plugin pulls all your devices and exposes them
automatically. Easy peasey.

Here's a list of the devices that are currently exposed:

* **Binary Sensor** - door, leak, moisture, motion, smoke, and window state
* **Climate** - current temperature, target temperature, heat/cool mode
* **Cover** - exposed as a garage door or window covering (see notes)
* **Device Tracker** - home/not home status appears as an occupancy sensor
* **Fan** - on/off/speed
* **Input boolean** - on/off
* **Lights** - on/off/brightness
* **Lock** - lock/unlock lock
* **Media Players** - exposed as an on/off switch
* **Scenes** - exposed as an on/off switch
* **Sensors** - carbon dioxide (CO2), humidity, light, temperature sensors
* **Switches** - on/off

### Binary Sensor Support

Binary Sensors must have a `device_class` set. Accepted `device_class`es are `moisture`, `motion`, `occupancy`, `opening` and `smoke`.

For binary sensors with the `opening` `device_class` you can also set `homebridge_opening_type` to `window` to have the entity display as a window instead of a door to Homebridge.

### Cover Support

Covers on your Home Assistant will appear as a garage door by default. In order
to do change this you may specify its type in the `customize` section of your
Home Assistant's `configuration.yaml`. Refer to the following example:

```
customize:
  cover.lounge_main:
    homebridge_cover_type: rollershutter
  cover.garage:
    homebridge_cover_type: garage_door
```

### Device Tracker

Device trackers will appear in HomeKit as a room occupancy sensor.

### Media Player Support

Media players on your Home Assistant will be added to your HomeKit as a switch.
While this seems like a hack at first, it's actually quite useful. While you
can't control everything a media player does, it will give you the ability to
toggle them on or off.

There are some rules to know about how on/off treats your media player. If
your media player supports play/pause, then turning them on and off via
HomeKit will play and pause them. If they do not support play/pause but instead
support on/off they will be turned on and off.

### Scene Support

Scenes will appear to HomeKit as switches. To trigger them, you can simply say
"turn on party time". In some cases, scene names are already reserved in
HomeKit...like "Good Morning" and "Good Night". These scenes already exist and
cannot be deleted. Simply add your Home Assistant scene to them and set the
state you would like them to be when executed. That's most like the ON state.
The switch will automatically turn off shortly after turning on.

### Sensor Support

Carbon dioxide (CO2), humidity, light and temperature sensors are currently supported.

- Light sensors will be found if an entity has its unit of measurement set to `lux`.
- Temperature sensors will be found if an entity has its unit of measurement set to `°C` or `°C`.
- Humidity sensors will be found if an entity has its unit of measurement set to `%` and has an entity ID containing `humidity` _or_ `homebridge_sensor_type` is set to `humidity` on the entity.
- Carbon Dioxide (CO2) sensors will be found if an entity has its unit of measurement set to `ppm` and has an entity ID containing `co2` _or_ `homebridge_sensor_type` is set to `co2` on the entity.

## Installation

After installing and setting up [Homebridge](https://github.com/nfarina/homebridge), you can install the Home Assistant plugin with:

    npm install -g homebridge-homeassistant

Once installed, update your Homebridge's `config.json`.

You can run `sudo npm upgrade -g homebridge-homeassistant` to upgrade your installation at any time.

## Configuration

As with other Homebridge plugins, you configure the Home Assistant plugin by
adding it to your `config.json`.
To avoid too much information in your log, just set `logging` to `false` as soon as everything works smoothly.

```json
"platforms": [
  {
    "platform": "HomeAssistant",
    "name": "HomeAssistant",
    "host": "http://127.0.0.1:8123",
    "password": "yourapipassword",
    "supported_types": ["binary_sensor", "climate", "cover", "device_tracker", "fan", "input_boolean", "light", "lock", "media_player", "scene", "sensor", "switch"],
    "logging": true
  }
]
```

You can optionally whitelist the device types that are exposed to HomeKit with the `supported_types` array. Just remove a device type that you don't want and they will be ignored.

### Using with self signed SSL certificates

If you have set up SSL using a self signed certificate, you will need to start Homebridge after running `export NODE_TLS_REJECT_UNAUTHORIZED=0` to allow bypassing the Node.js certificate checks.

## Customization

If there's an entity you'd like to hide from Homebridge, you can do that by adding a `homebridge_hidden` tag and setting it to `true` in your Home Assistant customization configuration. Again, this is set on the Home Assistant side. e.g.:

```yaml
customize:
  switch.a_switch:
    homebridge_hidden: true
```

You can also customize the name of a device by setting `homebridge_name` like this:

```yaml
customize:
  switch.a_switch:
    homebridge_name: My awesome switch
```

## Contributions

* fork
* create a feature branch
* open a Pull Request
