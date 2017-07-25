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

The following devices are currently supported:

* **Alarm Control Panel** - arm (home, away, night), disarm, and triggered (see notes)
* **Automation** - on/off (see notes)
* **Binary Sensor** - gas, moisture, motion, occupancy, opening, and smoke (see notes)
* **Climate** - current temperature, target temperature, heat/cool mode (see notes)
* **Cover** - exposed as a garage door or window covering (see notes)
* **Device Tracker** - exposed as an occupancy sensor (see notes)
* **Fan** - on/off/speed
* **Group** - on/off
* **Input Boolean** - on/off
* **Light** - on/off/brightness/hue/saturation
* **Lock** - lock/unlock (see notes)
* **Media Player** - on/off (see notes)
* **Remote** - on/off
* **Scene** - on/off (see notes)
* **Sensor** - air quality, carbon dioxide, carbon monoxide, humidity, light, and temperature sensors (see notes)
* **Switch** - on/off (see notes)

### Alarm Control Panel Support

Home Assistant does not currently support "Night" arming. For now, selecting "Night" within HomeKit apps will set the system to "Home".

If your alarm control panel is setup to use a code, you must use `homebridge_alarm_code` to specify the code.

### Automation Support

Automations will appear in HomeKit as switches.

### Binary Sensor Support

Binary Sensors must have a `device_class` set to `gas`, `moisture`, `motion`, `occupancy`, `opening`, or `smoke`.

For binary sensors with the `device_class` set to `gas`, you can control the gas type by setting `homebridge_gas_type` to `co2` or `co` (`co` is default).

Battery tracking is also supported for this device type, see notes below.

### Climate Support

Climate support is still a work in progress due to the variety of devices, information, formats, states, etc. in Home Assistant.

Any feedback is appreciated and will help speed up further development.

### Cover Support

Covers will appear in HomeKit as a garage door by default.

You can control this behavior by setting `homebridge_cover_type` to `garage_door` or `rollershutter`.

### Device Tracker

Device tracker entities will appear in HomeKit as a room occupancy sensor (`home` will show as 'triggered')

Battery tracking is also supported for this device type, see notes below.

### Group Support

Groups will appear in HomeKit as switches.

### Lock Support

Battery tracking is also supported for this device type, see notes below.

### Media Player Support

Media players on your Home Assistant will be added to your HomeKit as a switch.
While this seems like a hack at first, it's actually quite useful. While you
can't control everything a media player does, it will give you the ability to
toggle them on or off.

There are some rules to know about how on/off treats your media player. If
your media player supports play/pause, then turning them on and off via
HomeKit will play and pause them. If they do not support play/pause but instead
support on/off they will be turned on and off. If none of the above, HomeKit will play and stop.

You can specify the mode to run by setting `homebridge_media_player_switch` to `on_off`, `play_pause`, or `play_stop` respectively.

### Scene Support

Scenes will appear to HomeKit as switches. To trigger them, you can simply say
"turn on party time". In some cases, scene names are already reserved in
HomeKit...like "Good Morning" and "Good Night". These scenes already exist and
cannot be deleted. Simply add your Home Assistant scene to them and set the
state you would like them to be when executed. That's most like the ON state.
The switch will automatically turn off shortly after turning on.

### Sensor Support

Air quality (AQI), Carbon dioxide (ppm), carbon monoxide (ppm), humidity (%), light (lux or lx), and temperature (°C or °F) sensors are currently supported.

Sensors must have `homebridge_sensor_type` set to `air_quality`, `co2`, `co`, `humidity`, `light`, or `temperature` and units of measurement must match those shown above (case is not sensitive).

Battery tracking is also supported for this device type, see notes below.

### Switch Support

Switches will appear in HomeKit as a switch by default. Setting `homebridge_switch_type` to `outlet` will force the entity to appear as an outlet in HomeKit.

## Installation

After installing and setting up [Homebridge](https://github.com/nfarina/homebridge), you can install the Home Assistant plugin with:

    npm install -g homebridge-homeassistant

Once installed, update your Homebridge's `config.json`.

You can run `sudo npm upgrade -g homebridge-homeassistant` to upgrade your installation at any time.

## Configuration

As with other Homebridge plugins, you configure the Home Assistant plugin by adding it to your `config.json`.

To avoid too much information in your log, just set `logging` to `false` as soon as everything works smoothly.

```json
"platforms": [
  {
    "platform": "HomeAssistant",
    "name": "HomeAssistant",
    "host": "http://127.0.0.1:8123",
    "password": "yourapipassword",
    "supported_types": ["binary_sensor", "climate", "cover", "device_tracker", "fan", "group", "input_boolean", "light", "lock", "media_player", "remote", "scene", "sensor", "switch"],
    "default_visibility": "hidden",
    "logging": true,
    "verify_ssl": true
  }
]
```

You can optionally whitelist the device types that are exposed to HomeKit with the `supported_types` array. Just remove a device type that you don't want and they will be ignored.

To control which entities are passed to Homebridge, you must specify `default_visibility` to `hidden` or `visible`.

Then, you can control individual entities within Home Assistant using `homebridge_hidden` or `homebridge_visible`.

Example
"I want all of my devices to be hidden by default and I'll choose which ones are visible to Homebridge."

```json
"platforms": [
  {
    "default_visibility": "hidden"
  }
]
```

```yaml
customize:
  switch.example:
    homebridge_visible: true
```

"I want all of my devices to be visible by default and I'll choose which ones are hidden from Homebridge."

```json
"platforms": [
  {
    "default_visibility": "visible"
  }
]
```

```yaml
customize:
  switch.example:
    homebridge_hidden: true
```

### Using with self signed SSL certificates

If you have set up SSL using a self signed certificate, you will need to to set `verify_ssl` to `false` in your `config.json` file to allow bypassing the Node.js certificate checks.

## Customization

By default, HomeKit will use `friendly_name` to generate names for each entity. You can override this by using `homebridge_name`.

Additionally you can specify the accessory information by setting `homebridge_mfg`, `homebridge_model`, and `homebridge_serial` to whatever you'd like. If not specified, the information will be generated from Home Assistant automatically.

## Battery Tracking

Battery tracking is supported for binary sensors, device trackers, locks, and sensors.

`homebridge_battery_source` must be set to an entity with '%' as its unit of measurement.

`homebridge_charging_source` must set to an entity with `charging` as one of its possible states.

If `homebridge_battery_source` is specified but `homebridge_charging_source` is not, then HomeKit will consider the battery as 'not chargeable'.

If necessary, you can create template sensors within Home Assistant to use for `homebridge_battery_source` and `homebridge_charging_source`.

## Contributions

* fork
* create a feature branch
* open a Pull Request
