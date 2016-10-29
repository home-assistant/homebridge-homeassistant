
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
* **Cover** - exposed as a garage door or window covering (see notes)
* **Fan** - on/off/speed
* **Input boolean** - on/off
* **Lights** - on/off/brightness
* **Lock** - lock/unlock lock
* **Media Players** - exposed as an on/off switch
* **Scenes** - exposed as an on/off switch
* **Sensors** - temperature, light and humidity sensors
* **Switches** - on/off

These devices are currently exposed __but will be removed in the near future__ as [they have been removed from Home Assistant as of 0.32](https://github.com/home-assistant/home-assistant/pull/4037):

* **Garage Door** - open/close garage door
* **Rollershutter** - exposed as a garage door

### Scene Support

Scenes will appear to HomeKit as switches. To trigger them, you can simply say
"turn on party time". In some cases, scene names are already reserved in
HomeKit...like "Good Morning" and "Good Night". These scenes already exist and
cannot be deleted. Simply add your Home Assistant scene to them and set the
state you would like them to be when executed. That's most like the ON state.

### Media Player Support

Media players on your Home Assistant will be added to your HomeKit as a switch.
While this seems like a hack at first, it's actually quite useful. While you
can't control everything a media player does, it will give you the ability to
toggle them on or off.

There are some rules to know about how on/off treats your media player. If
your media player supports play/pause, then turning them on and off via
HomeKit will play and pause them. If they do not support play/pause but instead
support on/off they will be turned on and off.

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

## Installation

After installing and setting up [Homebridge](https://github.com/nfarina/homebridge), you can install the Home Assistant plugin with:

    npm install -g homebridge-homeassistant

Once installed, update your Homebridge's `config.json`.

## Configuration

As with other Homebridge plugins, you configure the Home Assistant plugin by
adding it to your `config.json`.

```json
"platforms": [
  {
    "platform": "HomeAssistant",
    "name": "HomeAssistant",
    "host": "http://192.168.1.16:8123",
    "password": "yourapipassword",
    "supported_types": ["binary_sensor", "cover", "fan", "garage_door", "input_boolean", "light", "lock", "media_player", "rollershutter", "scene", "sensor", "switch"]
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
