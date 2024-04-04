# onstar2mqtt

[![ci](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/ci.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/ci.yml)
[![CodeQL](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/codeql-analysis.yml)
[![release](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/release.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/release.yml)
<!-- [![Notarize Assets with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_notarize.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_notarize.yml)
[![Authenticate Assets with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_authenticate.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas_authenticate.yml)
[![Notarize and Authenticate Docker Image BOM with CAS](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas-docker-notarize-authenticate.yml/badge.svg)](https://github.com/BigThunderSR/onstar2mqtt/actions/workflows/cas-docker-notarize-authenticate.yml) -->

A service that utilizes the [OnStarJS](https://github.com/samrum/OnStarJS) library to expose OnStar data to MQTT topics. Please note that only US and Canadian OnStar accounts are known to work with this integration.

~~The functionality is mostly focused around EVs (specifically the Bolt EV), however PRs for other vehicle types are certainly welcome.~~

There is no affiliation with this project and GM, Chevrolet nor OnStar. In fact, it would be nice if they'd even respond to development requests so we wouldn't have to reverse engineer their API.

## Running

Collect the following information:

1. [Generate](https://www.uuidgenerator.net/version4) a v4 uuid for the device ID
1. OnStar login: username, password, PIN
1. Your car's VIN. Easily found in the monthly OnStar diagnostic emails.
1. MQTT server information: hostname, username, password
    1. If using TLS, define `MQTT_PORT` and `MQTT_TLS=true`
    1. **NEW! - Provide MQTT topic (MQTT_ONSTAR_POLLING_STATUS_TOPIC) for Onstar Data Polling Status to monitor success/failure when OnStar is polled for data**
       * MQTT_ONSTAR_POLLING_STATUS_TOPIC/lastpollsuccessful - "true" or "false" depending on status of last poll
       * MQTT_ONSTAR_POLLING_STATUS_TOPIC/state - Polling Status and Detailed Error Messages in JSON
       * **NEW! - Automatic creation of pollingStatusTopic starting at v1.11.0**
         * No longer need to specify MQTT_ONSTAR_POLLING_STATUS_TOPIC as this is now created automatically
         * Format is "homeassistant/YOUR_CAR_VIN/polling_status/"
         * If it is explicitly specified, will use the specified value, so does not break backwards compatibility

Supply these values to the ENV vars below. The default data refresh interval is 30 minutes and can be overridden with ONSTAR_REFRESH with values in milliseconds.

* **NEW - Ability to dynamically change polling frequency using MQTT**
  * Uses the value from "ONSTAR_REFRESH" on initial startup
  * Change the value dynamically by publishing the new refresh value in milliseconds (ms) as an INT to: "homeassistant/YOUR_CAR_VIN/refresh_interval"
  * Added new retained topic of "homeassistant/YOUR_CAR_VIN/refresh_interval_current_val" to monitor current refresh value set via MQTT

* **NEW - Command Response Status is now published to MQTT topics!**
  * Topic format: MQTT_PREFIX/YOUR_CAR_VIN/command/{commandName}/state
    * Note: Unless defined, default MQTT_PREFIX=homeassistant

* **NEW - Sensor specific messages are now published to MQTT as sensor attributes which are visible in HA**

* **NEW - Most non-binary sensors have a state_class assigned to allow collection of long-term statistics in HA**

* **NEW - Manual diagnostic refresh command and manual engine RPM refresh command are working**

* **NEW - OnStar password/pin and MQTT password are masked by default in the console log output. To see these values in the console log output, set "--env LOG_LEVEL=debug"**

* **NEW - New env options for securing connectivity for MQTTS using TLS**
  * MQTT_REJECT_UNAUTHORIZED (Default: "true", set to "false" only for testing.)
  * MQTT_CA_FILE
  * MQTT_CERT_FILE
  * MQTT_KEY_FILE

* **NEW - Auto discovery for device_tracker has been enabled starting at v1.12.0**
  * The device_tracker auto discovery config is published to: "homeassistant/device_tracker/YOUR_CAR_VIN/config" and the GPS coordinates are still read from the original topic automatically at: "homeassistant/device_tracker/YOUR_CAR_VIN/getlocation/state"
  * Also added GPS based speed and direction to the device_tracker attributes

* **NEW - Ability to send commands with options using MQTT now works**
  * Send commands to the command topic in the format:
    * {"command": "diagnostics","options": "OIL LIFE,VEHICLE RANGE"}
    * {"command": "setChargingProfile","options": {"chargeMode": "RATE_BASED","rateType": "OFFPEAK"}}
    * {"command": "alert","options": {"action": "Flash"}}

* **NEW - MQTT Button Auto-Discovery for HA Added Starting at v1.14.0**
  * Buttons are added disabled by default because it's easy to accidentally press the wrong button and trigger an action at an inopportune time.
Enable at your own risk and you assume all responsibility for your actions.
  * All available buttons for all vehicles are included for now, so only enable the buttons you need and/or work for your vehicle.

* **NEW - MQTT Auto-Discovery for Command Status Sensors for HA Added Starting at v1.15.0**
  * Command Status and Timestamp from last command run are published to MQTT auto-discovery topics and are grouped in a MQTT device grouping for all command status sensors for the same vehicle.

* **NEW - MQTT Auto-Discovery for Polling Status Sensors for HA Added Starting at v1.16.0**
  * Polling Status, Timestamp, Error Code (if applicable), Success T/F Sensor from last pollig cycle and Polling Refresh Interval Time Sensor are published to MQTT auto-discovery topics and are grouped in a MQTT device grouping for all command status sensors for the same vehicle.

* **NEW - MQTT Auto-Discovery for Sensor Status Message Sensors for HA Added Starting at v1.17.0**
  * At this point, pretty much every available sensor, button and status is published to MQTT auto-discovery topics
  * Set 'MQTT_LIST_ALL_SENSORS_TOGETHER="true"' to group all the sensors under one MQTT device starting at v1.17.0. Default is "false".  

## Helpful Usage Notes

* The OnStar API has rate limiting, so they will block excessive requests over a short period of time.
  * Reducing the polling timeout to less than 30 minutes/1800000 ms is likely to get you rate limited (Error 429).
* The OnStar API can be very temperamental, so you may see numerous errors every now and then where you cannot get any data from your vehicle. These tend to be very sporadic and usually go away on their own.
  * A common example of this is: "Request Failed with status 504 - Gateway Timeout"
* After your engine is turned off, the vehicle will respond to about 4 - 5 requests before going into a type of hibernation mode and will not respond to requests or commands until the engine is started up again. If your engine has been off for a while, you may still not be able to get any data from the vehicle or run commands even if it is your first attempt at trying to pull data from your vehicle after the engine was turned off.
  * **Note:** You will see an error of *"Unable to establish packet session to the vehicle"* when this occurs.

### Docker

[Docker Hub](https://hub.docker.com/r/bigthundersr/onstar2mqtt)

```shell
docker run \
  --env ONSTAR_DEVICEID= \
  --env ONSTAR_VIN= \
  --env ONSTAR_USERNAME= \
  --env ONSTAR_PASSWORD= \
  --env ONSTAR_PIN= \
  --env MQTT_HOST= \
  --env MQTT_USERNAME \
  --env MQTT_PASSWORD \
  --env MQTT_ONSTAR_POLLING_STATUS_TOPIC \
  bigthundersr/onstar2mqtt:latest
```

[GitHub Container Registry](https://github.com/BigThunderSR/onstar2mqtt/pkgs/container/onstar2mqtt)

```shell
docker run \
  --env ONSTAR_DEVICEID= \
  --env ONSTAR_VIN= \
  --env ONSTAR_USERNAME= \
  --env ONSTAR_PASSWORD= \
  --env ONSTAR_PIN= \
  --env MQTT_HOST= \
  --env MQTT_USERNAME \
  --env MQTT_PASSWORD \
  --env MQTT_ONSTAR_POLLING_STATUS_TOPIC \
  ghcr.io/bigthundersr/onstar2mqtt:latest
```

### docker-compose

[Docker Hub](https://hub.docker.com/r/bigthundersr/onstar2mqtt)

```yaml
  onstar2mqtt:
    container_name: onstar2mqtt
    image: bigthundersr/onstar2mqtt
    restart: unless-stopped
    env_file:
      - /srv/containers/secrets/onstar2mqtt.env
    environment:
    - ONSTAR_DEVICEID=
    - ONSTAR_VIN=
    - MQTT_HOST=
```

[GitHub Container Registry](https://github.com/BigThunderSR/onstar2mqtt/pkgs/container/onstar2mqtt)

```yaml
  onstar2mqtt:
    container_name: onstar2mqtt
    image: ghcr.io/bigthundersr/onstar2mqtt
    restart: unless-stopped
    env_file:
      - /srv/containers/secrets/onstar2mqtt.env
    environment:
    - ONSTAR_DEVICEID=
    - ONSTAR_VIN=
    - MQTT_HOST=
```

onstar2mqtt.env:

```shell
ONSTAR_USERNAME=
ONSTAR_PASSWORD=
ONSTAR_PIN=
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_ONSTAR_POLLING_STATUS_TOPIC=

```

### Node.js

It's a typical node.js application, define the same environment values as described in the docker sections and run with:
`npm run start`. Currently, this is only tested with Node.js 18.x.

### Home Assistant configuration templates

MQTT auto discovery is enabled. For further integrations and screenshots see [HA-MQTT.md](HA-MQTT.md).

## Development

### Running with npm

`npm run start`

### Testing

`npm run test`

### Coverage

`npm run coverage`

### Releases

`npm version [major|minor|patch] -m "Version %s" && git push --follow-tags`

Publish the release on GitHub to trigger a release build (i.e. update 'latest' docker tag).

## If you would like to run this as a Home Assistant add-on

[https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt](https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt)

## My other related project which provides additional capabilities through Node-RED

[https://github.com/BigThunderSR/node-red-contrib-onstar2](https://github.com/BigThunderSR/node-red-contrib-onstar2)
