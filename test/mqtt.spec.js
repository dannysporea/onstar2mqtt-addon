const assert = require('assert');
const _ = require('lodash');

const { Diagnostic } = require('../src/diagnostic');
const MQTT = require('../src/mqtt');
const Vehicle = require('../src/vehicle');
const apiResponse = require('./diagnostic.sample.json');

describe('MQTT', () => {
    let mqtt;
    let vehicle = new Vehicle({ make: 'foo', model: 'bar', vin: 'XXX', year: 2020 });
    beforeEach(() => mqtt = new MQTT(vehicle));

    it('should set defaults', () => {
        assert.strictEqual(mqtt.prefix, 'homeassistant');
        assert.strictEqual(mqtt.instance, 'XXX');
    });

    it('should convert names for mqtt topics', () => {
        assert.strictEqual(MQTT.convertName('foo bar'), 'foo_bar');
        assert.strictEqual(MQTT.convertName('foo bar bazz'), 'foo_bar_bazz');
        assert.strictEqual(MQTT.convertName('FOO BAR'), 'foo_bar');
        assert.strictEqual(MQTT.convertName('FOO BAR bazz'), 'foo_bar_bazz');
    });

    it('should convert names to be human readable', () => {
        assert.strictEqual(MQTT.convertFriendlyName('foo bar'), 'Foo Bar');
        assert.strictEqual(MQTT.convertFriendlyName('FOO BAR'), 'Foo Bar');
    });

    it('should determine sensor types', () => {
        assert.strictEqual(MQTT.determineSensorType('EV CHARGE STATE'), 'binary_sensor');
        assert.strictEqual(MQTT.determineSensorType('EV PLUG STATE'), 'binary_sensor');
        assert.strictEqual(MQTT.determineSensorType('PRIORITY CHARGE INDICATOR'), 'binary_sensor');
        assert.strictEqual(MQTT.determineSensorType('PRIORITY CHARGE STATUS'), 'binary_sensor');
        assert.strictEqual(MQTT.determineSensorType('getLocation'), 'device_tracker');
        assert.strictEqual(MQTT.determineSensorType('foo'), 'sensor');
        assert.strictEqual(MQTT.determineSensorType(''), 'sensor');
    });

    describe('topics', () => {
        let d;

        it('should generate availability topic', () => {
            assert.strictEqual(mqtt.getAvailabilityTopic(), 'homeassistant/XXX/available');
        });

        it('should generate command topic', () => {
            assert.strictEqual(mqtt.getCommandTopic(), 'homeassistant/XXX/command');
        });

        it('should generate polling status topic', () => {
            assert.strictEqual(mqtt.getPollingStatusTopic(), 'homeassistant/XXX/polling_status');
        });

        it('should generate refresh interval topic', () => {
            assert.strictEqual(mqtt.getRefreshIntervalTopic(), 'homeassistant/XXX/refresh_interval');
        });

        it('should generate command topic', () => {
            assert.strictEqual(mqtt.getRefreshIntervalCurrentValTopic(), 'homeassistant/XXX/refresh_interval_current_val');
        });

        it('should generate command topic', () => {
            assert.strictEqual(mqtt.getDeviceTrackerConfigTopic(), 'homeassistant/device_tracker/XXX/config');
        });

        describe('sensor', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[0]')));

            it('should generate config topics', () => {
                assert.strictEqual(mqtt.getConfigTopic(d), 'homeassistant/sensor/XXX/ambient_air_temperature/config');
            });
            it('should generate state topics', () => {
                assert.strictEqual(mqtt.getStateTopic(d), 'homeassistant/sensor/XXX/ambient_air_temperature/state');
            });
        });

        describe('binary_sensor', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[3]')));
            it('should generate config topics', () => {
                assert.strictEqual(mqtt.getConfigTopic(d), 'homeassistant/binary_sensor/XXX/ev_charge_state/config');
            });
            it('should generate state topics', () => {
                assert.strictEqual(mqtt.getStateTopic(d.diagnosticElements[1]), 'homeassistant/binary_sensor/XXX/priority_charge_indicator/state');
            });
        });
    });

    describe('addNamePrefix', () => {
        it('should return the original name when namePrefix is not set', () => {
            mqtt.namePrefix = null;
            const name = 'TestName';
            const result = mqtt.addNamePrefix(name);
            assert.strictEqual(result, name);
        });

        it('should return the name with prefix when namePrefix is set', () => {
            mqtt.namePrefix = 'Prefix';
            const name = 'TestName';
            const expected = 'Prefix TestName';
            const result = mqtt.addNamePrefix(name);
            assert.strictEqual(result, expected);
        });
    });

    describe('payloads', () => {
        let d;
        describe('sensor', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[0]')));
            it('should generate config payloads', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    //message: 'na',
                    state_class: 'measurement',
                    device_class: 'temperature',
                    json_attributes_template: undefined,
                    name: 'Ambient Air Temperature',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/ambient_air_temperature/state',
                    unique_id: 'xxx-ambient-air-temperature',
                    json_attributes_topic: undefined,
                    unit_of_measurement: '°C',
                    value_template: '{{ value_json.ambient_air_temperature }}'
                });
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[1]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    //message: 'na',
                    state_class: 'measurement',
                    device_class: 'temperature',
                    json_attributes_template: undefined,
                    name: 'Ambient Air Temperature F',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/ambient_air_temperature/state',
                    unique_id: 'xxx-ambient-air-temperature-f',
                    json_attributes_topic: undefined,
                    unit_of_measurement: '°F',
                    value_template: '{{ value_json.ambient_air_temperature_f }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    ambient_air_temperature: 15,
                    ambient_air_temperature_f: 59,
                    ambient_air_temperature_f_message: 'na',
                    ambient_air_temperature_message: 'na'
                    //ambient_air_temperature: 15,
                    //ambient_air_temperature_f: 59
                });
            });
        });

        describe('sensor', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[7]')));
            it('should generate config payloads', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'total_increasing',
                    device_class: 'distance',
                    json_attributes_template: undefined,
                    name: 'Odometer',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/odometer/state',
                    unique_id: 'xxx-odometer',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'km',
                    value_template: '{{ value_json.odometer }}'
                });
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[1]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'total_increasing',
                    device_class: 'distance',
                    json_attributes_template: undefined,
                    name: 'Odometer Mi',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/odometer/state',
                    unique_id: 'xxx-odometer-mi',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'mi',
                    value_template: '{{ value_json.odometer_mi }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    odometer: 6013.8,
                    odometer_message: "na",
                    odometer_mi: 3736.8,
                    odometer_mi_message: "na"
                });
            });
        });

        describe('binary_sensor', () => { // TODO maybe not needed, payloads not diff
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[3]')));
            it('should generate config payloads', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[1]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    //message: 'na',                      
                    state_class: undefined,
                    device_class: undefined,
                    json_attributes_template: undefined,
                    name: 'Priority Charge Indicator',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    payload_off: false,
                    payload_on: true,
                    state_topic: 'homeassistant/binary_sensor/XXX/ev_charge_state/state',
                    unique_id: 'xxx-priority-charge-indicator',
                    json_attributes_topic: undefined,
                    value_template: '{{ value_json.priority_charge_indicator }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    ev_charge_state: false,
                    ev_charge_state_message: 'charging_complete',
                    priority_charge_indicator: false,
                    priority_charge_indicator_message: 'na',
                    priority_charge_status: false,
                    priority_charge_status_message: 'na'
                    //ev_charge_state: false,
                    //priority_charge_indicator: false,
                    //priority_charge_status: false
                });
            });
        });

        /*        describe('attributes', () => {
                    beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[8]')));
                    it('should generate payloads with an attribute', () => {
                        assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                            availability_topic: 'homeassistant/XXX/available',
                            device: {
                                identifiers: [
                                    'XXX'
                                ],
                                manufacturer: 'foo',
                                model: '2020 bar',
                                name: '2020 foo bar'
                            },
                            //message: 'YELLOW',
                            state_class: 'measurement',
                            device_class: 'pressure',
                            json_attributes_template: "{{ {'recommendation': value_json.tire_pressure_placard_front, 'message': value_json.tire_pressure_lf_message} | tojson }}",
                            name: 'Tire Pressure: Left Front',
                            payload_available: 'true',
                            payload_not_available: 'false',
                            state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                            unique_id: 'xxx-tire-pressure-lf',
                            json_attributes_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                            unit_of_measurement: 'kPa',
                            value_template: '{{ value_json.tire_pressure_lf }}'
                        });
                    });
                }); */

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[8]')));
            it('should generate payloads with an attribute for left front tire', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },

                    state_class: 'measurement',
                    device_class: 'pressure',
                    json_attributes_template: "{{ {'recommendation': value_json.tire_pressure_placard_front, 'message': value_json.tire_pressure_lf_message} | tojson }}",
                    name: 'Tire Pressure: Left Front',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unique_id: 'xxx-tire-pressure-lf',
                    json_attributes_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unit_of_measurement: 'kPa',
                    value_template: '{{ value_json.tire_pressure_lf }}'
                });
            });
            it('should generate payloads with an attribute for right front tire', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[4]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },

                    state_class: 'measurement',
                    device_class: 'pressure',
                    json_attributes_template: "{{ {'recommendation': value_json.tire_pressure_placard_front, 'message': value_json.tire_pressure_rf_message} | tojson }}",
                    name: 'Tire Pressure: Right Front',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unique_id: 'xxx-tire-pressure-rf',
                    json_attributes_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unit_of_measurement: 'kPa',
                    value_template: '{{ value_json.tire_pressure_rf }}'
                });
            });
            it('should generate payloads with an attribute for left rear tire', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[1]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },

                    state_class: 'measurement',
                    device_class: 'pressure',
                    json_attributes_template: "{{ {'recommendation': value_json.tire_pressure_placard_rear, 'message': value_json.tire_pressure_lr_message} | tojson }}",
                    name: 'Tire Pressure: Left Rear',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unique_id: 'xxx-tire-pressure-lr',
                    json_attributes_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unit_of_measurement: 'kPa',
                    value_template: '{{ value_json.tire_pressure_lr }}'
                });
            });
            it('should generate payloads with an attribute for right rear tire', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[5]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },

                    state_class: 'measurement',
                    device_class: 'pressure',
                    json_attributes_template: "{{ {'recommendation': value_json.tire_pressure_placard_rear, 'message': value_json.tire_pressure_rr_message} | tojson }}",
                    name: 'Tire Pressure: Right Rear',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unique_id: 'xxx-tire-pressure-rr',
                    json_attributes_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    unit_of_measurement: 'kPa',
                    value_template: '{{ value_json.tire_pressure_rr }}'
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[10]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    //message: 'YELLOW',
                    state_class: 'measurement',
                    device_class: undefined,
                    json_attributes_template: "{{ {'message': value_json.oil_life_message} | tojson }}",
                    name: 'Oil Life',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/oil_life/state',
                    unique_id: 'xxx-oil-life',
                    json_attributes_topic: 'homeassistant/sensor/XXX/oil_life/state',
                    unit_of_measurement: '%',
                    value_template: '{{ value_json.oil_life }}'
                });
            });
        });

        describe('sensor', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[11]')));
            it('should generate config payloads', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: 'volume_storage',
                    json_attributes_template: undefined,
                    name: 'Fuel Amount',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/fuel_tank_info/state',
                    unique_id: 'xxx-fuel-amount',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'L',
                    value_template: '{{ value_json.fuel_amount }}'
                });
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[1]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: 'volume_storage',
                    json_attributes_template: undefined,
                    name: 'Fuel Capacity',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/fuel_tank_info/state',
                    unique_id: 'xxx-fuel-capacity',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'L',
                    value_template: '{{ value_json.fuel_capacity }}'
                });
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[2]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: undefined,
                    json_attributes_template: undefined,
                    name: 'Fuel Level',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/fuel_tank_info/state',
                    unique_id: 'xxx-fuel-level',
                    json_attributes_topic: undefined,
                    unit_of_measurement: '%',
                    value_template: '{{ value_json.fuel_level }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    fuel_amount: 19.98,
                    fuel_amount_gal: 5.3,
                    fuel_amount_gal_message: "na",
                    fuel_amount_message: "na",
                    fuel_capacity: 60,
                    fuel_capacity_gal: 15.9,
                    fuel_capacity_gal_message: "na",
                    fuel_capacity_message: "na",
                    fuel_level: 33.3,
                    fuel_level_in_gal: 19.98,
                    fuel_level_in_gal_gal: 5.3,
                    fuel_level_in_gal_gal_message: "na",
                    fuel_level_in_gal_message: "na",
                    fuel_level_message: "na"
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[12]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: undefined,
                    json_attributes_template: undefined,
                    name: 'Lifetime Fuel Econ',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/lifetime_fuel_econ/state',
                    unique_id: 'xxx-lifetime-fuel-econ',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'km/L',
                    value_template: '{{ value_json.lifetime_fuel_econ }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    lifetime_fuel_econ: 11.86,
                    lifetime_fuel_econ_message: "na",
                    lifetime_fuel_econ_mpg: 27.9,
                    lifetime_fuel_econ_mpg_message: "na"
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[13]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'total_increasing',
                    device_class: 'volume',
                    json_attributes_template: undefined,
                    name: 'Lifetime Fuel Used',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/lifetime_fuel_used/state',
                    unique_id: 'xxx-lifetime-fuel-used',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'L',
                    value_template: '{{ value_json.lifetime_fuel_used }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    lifetime_fuel_used: 4476.94,
                    lifetime_fuel_used_gal: 1182.7,
                    lifetime_fuel_used_gal_message: "na",
                    lifetime_fuel_used_message: "na"
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[4]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: undefined,
                    device_class: 'plug',
                    json_attributes_template: undefined,
                    name: 'Ev Plug State',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    payload_off: false,
                    payload_on: true,
                    state_topic: 'homeassistant/binary_sensor/XXX/ev_plug_state/state',
                    unique_id: 'xxx-ev-plug-state',
                    json_attributes_topic: undefined,
                    value_template: '{{ value_json.ev_plug_state }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    ev_plug_state: true,
                    ev_plug_state_message: "plugged"
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[1]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: undefined,
                    device_class: undefined,
                    json_attributes_template: undefined,
                    name: 'Charger Power Level',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/charger_power_level/state',
                    unique_id: 'xxx-charger-power-level',
                    unit_of_measurement: undefined,
                    json_attributes_topic: undefined,
                    value_template: '{{ value_json.charger_power_level }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    charger_power_level: 'NO_REDUCTION',
                    charger_power_level_message: 'na'
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[2]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: undefined,
                    json_attributes_template: undefined,
                    name: 'Electric Economy',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/energy_efficiency/state',
                    unique_id: 'xxx-electric-economy',
                    json_attributes_topic: undefined,
                    unit_of_measurement: 'kWh',
                    value_template: '{{ value_json.electric_economy }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    electric_economy: 21.85,
                    electric_economy_message: "na",
                    lifetime_efficiency: 21.85,
                    lifetime_efficiency_message: "na",
                    lifetime_mpge: 40.73,
                    lifetime_mpge_message: "na",
                    lifetime_mpge_mpge: 95.8,
                    lifetime_mpge_mpge_message: "na",
                    odometer: 6013.8,
                    odometer_message: "na",
                    odometer_mi: 3736.8,
                    odometer_mi_message: "na",
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[9]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: 'measurement',
                    device_class: 'distance',
                    json_attributes_template: undefined,
                    name: 'Ev Range',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    state_topic: 'homeassistant/sensor/XXX/vehicle_range/state',
                    unique_id: 'xxx-ev-range',
                    unit_of_measurement: 'km',
                    json_attributes_topic: undefined,
                    value_template: '{{ value_json.ev_range }}'
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    ev_range: 341,
                    ev_range_message: 'na',
                    ev_range_mi: 211.9,
                    ev_range_mi_message: 'na',
                });
            });
        });

        describe('attributes', () => {
            beforeEach(() => d = new Diagnostic(_.get(apiResponse, 'commandResponse.body.diagnosticResponse[3]')));
            it('should generate payloads with an attribute', () => {
                assert.deepStrictEqual(mqtt.getConfigPayload(d, d.diagnosticElements[0]), {
                    availability_topic: 'homeassistant/XXX/available',
                    device: {
                        identifiers: [
                            'XXX'
                        ],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: "2020 foo bar Sensors",
                    },
                    state_class: undefined,
                    device_class: 'battery_charging',
                    json_attributes_template: undefined,
                    name: 'Ev Charge State',
                    payload_available: 'true',
                    payload_not_available: 'false',
                    payload_off: false,
                    payload_on: true,
                    state_topic: 'homeassistant/binary_sensor/XXX/ev_charge_state/state',
                    unique_id: 'xxx-ev-charge-state',
                    json_attributes_topic: undefined,
                    value_template: "{{ value_json.ev_charge_state }}",
                });
            });
            it('should generate state payloads', () => {
                assert.deepStrictEqual(mqtt.getStatePayload(d), {
                    ev_charge_state: false,
                    ev_charge_state_message: "charging_complete",
                    priority_charge_indicator: false,
                    priority_charge_indicator_message: "na",
                    priority_charge_status: false,
                    priority_charge_status_message: "na",
                });
            });
        });


        describe('createCommandStatusSensorConfigPayload', () => {
            it('should generate command status sensor config payload when listAllSensorsTogether is true', () => {
                const command = 'lock';
                const listAllSensorsTogether = true;
                const expectedConfigPayload = {
                    topic: "homeassistant/sensor/XXX/lock_status_monitor/config",
                    payload: {
                        availability: {
                            payload_available: 'true',
                            payload_not_available: 'false',
                            topic: "homeassistant/XXX/available",
                        },
                        device: {
                            identifiers: [
                                'XXX'
                            ],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar',
                            suggested_area: "2020 foo bar",
                        },
                        icon: 'mdi:message-alert',
                        name: 'Command lock Status Monitor',
                        state_topic: 'homeassistant/XXX/command/lock/state',
                        unique_id: 'xxx_lock_command_status_monitor',
                        value_template: '{{ value_json.command.error.message }}',
                    }
                };
                const result = mqtt.createCommandStatusSensorConfigPayload(command, listAllSensorsTogether);
                assert.deepStrictEqual(result, expectedConfigPayload);
            });

            it('should generate command status sensor config payload when listAllSensorsTogether is false', () => {
                const command = 'lock';
                const listAllSensorsTogether = false;
                const expectedConfigPayload = {
                    topic: "homeassistant/sensor/XXX/lock_status_monitor/config",
                    payload: {
                        availability: {
                            payload_available: 'true',
                            payload_not_available: 'false',
                            topic: "homeassistant/XXX/available",
                        },
                        device: {
                            identifiers: [
                                'XXX_Command_Status_Monitor'
                            ],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar Command Status Monitor Sensors',
                            suggested_area: "2020 foo bar Command Status Monitor Sensors",
                        },
                        icon: 'mdi:message-alert',
                        name: 'Command lock Status Monitor',
                        state_topic: 'homeassistant/XXX/command/lock/state',
                        unique_id: 'xxx_lock_command_status_monitor',
                        value_template: '{{ value_json.command.error.message }}',
                    }
                };
                const result = mqtt.createCommandStatusSensorConfigPayload(command, listAllSensorsTogether);
                assert.deepStrictEqual(result, expectedConfigPayload);
            });
        });


        describe('createCommandStatusSensorTimestampConfigPayload', () => {
            it('should generate command status sensor timestamp config payload when listAllSensorsTogether is true', () => {
                const command = 'lock';
                const listAllSensorsTogether = true;
                const expectedConfigPayload = {
                    topic: "homeassistant/sensor/XXX/lock_status_timestamp/config",
                    payload: {
                        availability: {
                            payload_available: 'true',
                            payload_not_available: 'false',
                            topic: "homeassistant/XXX/available"
                        },
                        device: {
                            identifiers: [
                                'XXX'
                            ],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar',
                            suggested_area: "2020 foo bar",
                        },
                        device_class: "timestamp",
                        icon: "mdi:calendar-clock",
                        name: 'Command lock Status Monitor Timestamp',
                        state_topic: 'homeassistant/XXX/command/lock/state',
                        unique_id: 'xxx_lock_command_status_timestamp_monitor',
                        value_template: '{{ value_json.completionTimestamp }}',
                    }
                };
                const result = mqtt.createCommandStatusSensorTimestampConfigPayload(command, listAllSensorsTogether);
                assert.deepStrictEqual(result, expectedConfigPayload);
            });

            it('should generate command status sensor timestamp config payload when listAllSensorsTogether is false', () => {
                const command = 'lock';
                const listAllSensorsTogether = false;
                const expectedConfigPayload = {
                    topic: "homeassistant/sensor/XXX/lock_status_timestamp/config",
                    payload: {
                        availability: {
                            payload_available: 'true',
                            payload_not_available: 'false',
                            topic: "homeassistant/XXX/available"
                        },
                        device: {
                            identifiers: [
                                'XXX_Command_Status_Monitor'
                            ],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar Command Status Monitor Sensors',
                            suggested_area: "2020 foo bar Command Status Monitor Sensors",
                        },
                        device_class: "timestamp",
                        icon: "mdi:calendar-clock",
                        name: 'Command lock Status Monitor Timestamp',
                        state_topic: 'homeassistant/XXX/command/lock/state',
                        unique_id: 'xxx_lock_command_status_timestamp_monitor',
                        value_template: '{{ value_json.completionTimestamp }}',
                    }
                };
                const result = mqtt.createCommandStatusSensorTimestampConfigPayload(command, listAllSensorsTogether);
                assert.deepStrictEqual(result, expectedConfigPayload);
            });
        });

        describe('createPollingStatusMessageSensorConfigPayload', () => {
            it('should generate the correct sensor config payload for polling status message when listAllSensorsTogether is true', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status/state';
                const listAllSensorsTogether = true;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_message/config';
                const expectedPayload = {
                    "device": {
                        "identifiers": ['XXX'],
                        "manufacturer": 'foo',
                        "model": '2020 bar',
                        "name": '2020 foo bar',
                        "suggested_area": '2020 foo bar',
                    },
                    "availability": {
                        "topic": 'homeassistant/XXX/available',
                        "payload_available": 'true',
                        "payload_not_available": 'false',
                    },
                    "unique_id": 'xxx_polling_status_message',
                    "name": 'Polling Status Message',
                    "state_topic": pollingStatusTopicState,
                    "value_template": "{{ value_json.error.message }}",
                    "icon": "mdi:message-alert",
                };

                const result = mqtt.createPollingStatusMessageSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });

            it('should generate the correct sensor config payload for polling status message when listAllSensorsTogether is false', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status/state';
                const listAllSensorsTogether = false;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_message/config';
                const expectedPayload = {
                    "device": {
                        "identifiers": ['XXX_Command_Status_Monitor'],
                        "manufacturer": 'foo',
                        "model": '2020 bar',
                        "name": '2020 foo bar Command Status Monitor Sensors',
                        "suggested_area": '2020 foo bar Command Status Monitor Sensors',
                    },
                    "availability": {
                        "topic": 'homeassistant/XXX/available',
                        "payload_available": 'true',
                        "payload_not_available": 'false',
                    },
                    "unique_id": 'xxx_polling_status_message',
                    "name": 'Polling Status Message',
                    "state_topic": pollingStatusTopicState,
                    "value_template": "{{ value_json.error.message }}",
                    "icon": "mdi:message-alert",
                };

                const result = mqtt.createPollingStatusMessageSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });
        });

        describe('createPollingStatusCodeSensorConfigPayload', () => {
            it('should generate the correct config payload for polling status code sensor when listAllSensorsTogether is true', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_code/state';
                const listAllSensorsTogether = true;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_code/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_status_code',
                    name: 'Polling Status Code',
                    state_topic: pollingStatusTopicState,
                    value_template: '{{ value_json.error.response.status | int(0) }}',
                    icon: 'mdi:sync-alert',
                };

                const result = mqtt.createPollingStatusCodeSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });

            it('should generate the correct config payload for polling status code sensor when listAllSensorsTogether is false', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_code/state';
                const listAllSensorsTogether = false;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_code/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX_Command_Status_Monitor'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar Command Status Monitor Sensors',
                        suggested_area: '2020 foo bar Command Status Monitor Sensors',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_status_code',
                    name: 'Polling Status Code',
                    state_topic: pollingStatusTopicState,
                    value_template: '{{ value_json.error.response.status | int(0) }}',
                    icon: 'mdi:sync-alert',
                };

                const result = mqtt.createPollingStatusCodeSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });
        });

        describe('createPollingStatusTimestampSensorConfigPayload', () => {
            it('should generate the correct config payload when listAllSensorsTogether is true', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_timestamp/state';
                const listAllSensorsTogether = true;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_timestamp/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_status_timestamp',
                    name: 'Polling Status Timestamp',
                    state_topic: pollingStatusTopicState,
                    value_template: '{{ value_json.completionTimestamp }}',
                    device_class: 'timestamp',
                    icon: 'mdi:calendar-clock',
                };

                const result = mqtt.createPollingStatusTimestampSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });

            it('should generate the correct config payload when listAllSensorsTogether is false', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_timestamp/state';
                const listAllSensorsTogether = false;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_status_timestamp/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX_Command_Status_Monitor'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar Command Status Monitor Sensors',
                        suggested_area: '2020 foo bar Command Status Monitor Sensors',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_status_timestamp',
                    name: 'Polling Status Timestamp',
                    state_topic: pollingStatusTopicState,
                    value_template: '{{ value_json.completionTimestamp }}',
                    device_class: 'timestamp',
                    icon: 'mdi:calendar-clock',
                };

                const result = mqtt.createPollingStatusTimestampSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });
        });

        describe('createPollingRefreshIntervalSensorConfigPayload', () => {
            it('should generate the correct config payload for polling refresh interval sensor when listAllSensorsTogether is true', () => {
                const refreshIntervalCurrentValTopic = 'homeassistant/XXX/polling_refresh_interval/state';
                const listAllSensorsTogether = true;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_refresh_interval/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_refresh_interval',
                    name: 'Polling Refresh Interval',
                    state_topic: refreshIntervalCurrentValTopic,
                    value_template: '{{ value | int(0) }}',
                    icon: 'mdi:timer-check-outline',
                    unit_of_measurement: 'ms',
                    state_class: 'measurement',
                    device_class: 'duration',
                };

                const result = mqtt.createPollingRefreshIntervalSensorConfigPayload(refreshIntervalCurrentValTopic, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });

            it('should generate the correct config payload for polling refresh interval sensor when listAllSensorsTogether is false', () => {
                const refreshIntervalCurrentValTopic = 'homeassistant/XXX/polling_refresh_interval/state';
                const listAllSensorsTogether = false;
                const expectedTopic = 'homeassistant/sensor/XXX/polling_refresh_interval/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX_Command_Status_Monitor'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar Command Status Monitor Sensors',
                        suggested_area: '2020 foo bar Command Status Monitor Sensors',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_polling_refresh_interval',
                    name: 'Polling Refresh Interval',
                    state_topic: refreshIntervalCurrentValTopic,
                    value_template: '{{ value | int(0) }}',
                    icon: 'mdi:timer-check-outline',
                    unit_of_measurement: 'ms',
                    state_class: 'measurement',
                    device_class: 'duration',
                };

                const result = mqtt.createPollingRefreshIntervalSensorConfigPayload(refreshIntervalCurrentValTopic, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });
        });

        describe('createPollingStatusTFSensorConfigPayload', () => {
            it('should generate the correct config payload for polling status TF sensor when listAllSensorsTogether is true', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_tf/state';
                const listAllSensorsTogether = true;
                const expectedTopic = 'homeassistant/binary_sensor/XXX/polling_status_tf/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_onstar_polling_status_successful',
                    name: 'Polling Status Successful',
                    state_topic: pollingStatusTopicState,
                    payload_on: "false",
                    payload_off: "true",
                    device_class: "problem",
                    icon: "mdi:sync-alert",
                };

                const result = mqtt.createPollingStatusTFSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });

            it('should generate the correct config payload for polling status TF sensor when listAllSensorsTogether is false', () => {
                const pollingStatusTopicState = 'homeassistant/XXX/polling_status_tf/state';
                const listAllSensorsTogether = false;
                const expectedTopic = 'homeassistant/binary_sensor/XXX/polling_status_tf/config';
                const expectedPayload = {
                    device: {
                        identifiers: ['XXX_Command_Status_Monitor'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar Command Status Monitor Sensors',
                        suggested_area: '2020 foo bar Command Status Monitor Sensors',
                    },
                    availability: {
                        topic: 'homeassistant/XXX/available',
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_onstar_polling_status_successful',
                    name: 'Polling Status Successful',
                    state_topic: pollingStatusTopicState,
                    payload_on: "false",
                    payload_off: "true",
                    device_class: "problem",
                    icon: "mdi:sync-alert",
                };

                const result = mqtt.createPollingStatusTFSensorConfigPayload(pollingStatusTopicState, listAllSensorsTogether);

                assert.deepStrictEqual(result.topic, expectedTopic);
                assert.deepStrictEqual(result.payload, expectedPayload);
            });
        });

        describe('createButtonConfigPayload', () => {
            it('should create button config payload for a given vehicle', () => {
                const vehicle = {
                    make: 'Chevrolet',
                    model: 'Bolt',
                    year: 2022,
                    vin: '1G1FY6S07N4100000',
                    toString: () => `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                };

                const expectedButtonInstances = [];
                const expectedButtonConfigs = [];
                const expectedConfigPayloads = [];

                for (const buttonName in MQTT.CONSTANTS.BUTTONS) {
                    const buttonConfig = `homeassistant/button/XXX/${MQTT.convertName(buttonName)}/config`;
                    const button = {
                        name: buttonName,
                        config: buttonConfig,
                        vehicle: vehicle,
                    };

                    expectedButtonInstances.push(button);

                    let unique_id = `${vehicle.vin}_Command_${button.name}`;
                    unique_id = unique_id.replace(/\s+/g, '-').toLowerCase();

                    expectedConfigPayloads.push({
                        "device": {
                            "identifiers": [vehicle.vin],
                            "manufacturer": vehicle.make,
                            "model": vehicle.year + ' ' + vehicle.model,
                            "name": vehicle.toString(),
                            "suggested_area": vehicle.toString(),
                        },
                        "availability": {
                            "topic": 'homeassistant/XXX/available',
                            "payload_available": 'true',
                            "payload_not_available": 'false',
                        },
                        "unique_id": unique_id,
                        "name": `Command ${button.name}`,
                        "icon": MQTT.CONSTANTS.BUTTONS[button.name].Icon,
                        "command_topic": 'homeassistant/XXX/command',
                        "payload_press": JSON.stringify({ "command": MQTT.CONSTANTS.BUTTONS[button.name].Name }),
                        "qos": 2,
                        "enabled_by_default": false,
                    });

                    expectedButtonConfigs.push(buttonConfig);
                }

                const result = mqtt.createButtonConfigPayload(vehicle);

                assert.deepStrictEqual(result.buttonInstances, expectedButtonInstances);
                assert.deepStrictEqual(result.buttonConfigs, expectedButtonConfigs);
                assert.deepStrictEqual(result.configPayloads, expectedConfigPayloads);
            });
        });

        describe('createButtonConfigPayloadCSMG', () => {
            it('should generate the correct button config payload for a given vehicle', () => {
                const vehicle = {
                    make: 'foo',
                    model: 'bar',
                    year: 2020,
                    vin: '1G1FY6S07N4100000',
                    toString: function () { return `${this.year} ${this.make} ${this.model}`; }
                };

                const result = mqtt.createButtonConfigPayloadCSMG(vehicle);

                // Check the length of the arrays
                assert.strictEqual(result.buttonInstances.length, Object.keys(MQTT.CONSTANTS.BUTTONS).length);
                assert.strictEqual(result.buttonConfigs.length, Object.keys(MQTT.CONSTANTS.BUTTONS).length);
                assert.strictEqual(result.configPayloads.length, Object.keys(MQTT.CONSTANTS.BUTTONS).length);

                // Check the first button instance
                const firstButton = result.buttonInstances[0];
                assert.strictEqual(firstButton.name, Object.keys(MQTT.CONSTANTS.BUTTONS)[0]);
                assert.strictEqual(firstButton.config, `homeassistant/button/XXX/${MQTT.convertName(firstButton.name)}_monitor/config`);
                assert.strictEqual(firstButton.vehicle, vehicle);

                // Check the first config payload
                const firstPayload = result.configPayloads[0];
                assert.strictEqual(firstPayload.device.identifiers[0], `${vehicle.vin}_Command_Status_Monitor`);
                assert.strictEqual(firstPayload.device.manufacturer, vehicle.make);
                assert.strictEqual(firstPayload.device.model, `${vehicle.year} ${vehicle.model}`);
                assert.strictEqual(firstPayload.device.name, `${vehicle.toString()} Command Status Monitor Sensors`);
                assert.strictEqual(firstPayload.device.suggested_area, `${vehicle.toString()} Command Status Monitor Sensors`);
                assert.strictEqual(firstPayload.unique_id, `${vehicle.vin}_Command_${firstButton.name}_Monitor`.replace(/\s+/g, '-').toLowerCase());
                assert.strictEqual(firstPayload.name, `Command ${firstButton.name}`);
                assert.strictEqual(firstPayload.command_topic, mqtt.getCommandTopic());
                assert.strictEqual(firstPayload.payload_press, JSON.stringify({ "command": MQTT.CONSTANTS.BUTTONS[firstButton.name].Name }));
                assert.strictEqual(firstPayload.qos, 2);
                assert.strictEqual(firstPayload.enabled_by_default, false);
            });
        });

        describe('createSensorMessageConfigPayload', () => {
            beforeEach(() => {
                // Set up the MQTT instance and vehicle details
                mqtt.vehicle = {
                    make: 'foo',
                    model: 'bar',
                    year: 2020,
                    vin: 'XXX',
                    toString: function () { return `${this.year} ${this.make} ${this.model}`; }
                };
                mqtt.prefix = 'testPrefix';
                mqtt.instance = 'testInstance';
            });

            it('should create sensor message config payload when component is not provided', () => {
                const sensor = 'testSensor';
                const icon = 'testIcon';
                const expected = {
                    topic: 'testPrefix/sensor/testInstance/testSensor_message/config',
                    payload: {
                        device: {
                            identifiers: ['XXX'],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar',
                            suggested_area: '2020 foo bar',
                        },
                        availability: {
                            topic: mqtt.getAvailabilityTopic(),
                            payload_available: 'true',
                            payload_not_available: 'false',
                        },
                        unique_id: 'xxx_testSensor_message',
                        name: 'TestSensor Message',
                        state_topic: 'testPrefix/sensor/testInstance/testSensor/state',
                        value_template: '{{ value_json.testSensor_message }}',
                        icon: 'testIcon',
                    }
                };
                const result = mqtt.createSensorMessageConfigPayload(sensor, undefined, icon);
                assert.deepStrictEqual(result, expected);
            });

            it('should create sensor message config payload when component is provided', () => {
                const sensor = 'tire_pressure';
                const component = 'tire_pressure_lf_message';
                const icon = 'testIcon';
                const expected = {
                    topic: 'testPrefix/sensor/testInstance/tire_pressure_lf_message/config',
                    payload: {
                        device: {
                            identifiers: ['XXX'],
                            manufacturer: 'foo',
                            model: '2020 bar',
                            name: '2020 foo bar',
                            suggested_area: '2020 foo bar',
                        },
                        availability: {
                            topic: mqtt.getAvailabilityTopic(),
                            payload_available: 'true',
                            payload_not_available: 'false',
                        },
                        unique_id: 'xxx_tire_pressure_lf_message',
                        name: 'Tire Pressure: Left Front Message',
                        state_topic: 'testPrefix/sensor/testInstance/tire_pressure/state',
                        value_template: '{{ value_json.tire_pressure_lf_message }}',
                        icon: 'testIcon',
                    }
                };
                const result = mqtt.createSensorMessageConfigPayload(sensor, component, icon);
                assert.deepStrictEqual(result, expected);
            });
        });

        it('should create sensor message config payload for Right Front tire', () => {
            const sensor = 'tire_pressure';
            const component = 'tire_pressure_rf_message';
            const icon = 'testIcon';
            const expected = {
                topic: 'homeassistant/sensor/XXX/tire_pressure_rf_message/config',
                payload: {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: mqtt.getAvailabilityTopic(),
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_tire_pressure_rf_message',
                    name: 'Tire Pressure: Right Front Message',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    value_template: '{{ value_json.tire_pressure_rf_message }}',
                    icon: 'testIcon',
                }
            };
            const result = mqtt.createSensorMessageConfigPayload(sensor, component, icon);
            assert.deepStrictEqual(result, expected);
        });

        it('should create sensor message config payload for Left Rear tire', () => {
            const sensor = 'tire_pressure';
            const component = 'tire_pressure_lr_message';
            const icon = 'testIcon';
            const expected = {
                topic: 'homeassistant/sensor/XXX/tire_pressure_lr_message/config',
                payload: {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: mqtt.getAvailabilityTopic(),
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_tire_pressure_lr_message',
                    name: 'Tire Pressure: Left Rear Message',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    value_template: '{{ value_json.tire_pressure_lr_message }}',
                    icon: 'testIcon',
                }
            };
            const result = mqtt.createSensorMessageConfigPayload(sensor, component, icon);
            assert.deepStrictEqual(result, expected);
        });

        it('should create sensor message config payload for Right Rear tire', () => {
            const sensor = 'tire_pressure';
            const component = 'tire_pressure_rr_message';
            const icon = 'testIcon';
            const expected = {
                topic: 'homeassistant/sensor/XXX/tire_pressure_rr_message/config',
                payload: {
                    device: {
                        identifiers: ['XXX'],
                        manufacturer: 'foo',
                        model: '2020 bar',
                        name: '2020 foo bar',
                        suggested_area: '2020 foo bar',
                    },
                    availability: {
                        topic: mqtt.getAvailabilityTopic(),
                        payload_available: 'true',
                        payload_not_available: 'false',
                    },
                    unique_id: 'xxx_tire_pressure_rr_message',
                    name: 'Tire Pressure: Right Rear Message',
                    state_topic: 'homeassistant/sensor/XXX/tire_pressure/state',
                    value_template: '{{ value_json.tire_pressure_rr_message }}',
                    icon: 'testIcon',
                }
            };
            const result = mqtt.createSensorMessageConfigPayload(sensor, component, icon);
            assert.deepStrictEqual(result, expected);
        });
    });
});