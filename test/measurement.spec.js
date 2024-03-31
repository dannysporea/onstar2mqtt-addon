const assert = require('assert');
const Measurement = require('../src/measurement');

describe('Measurement', () => {
    describe('constructor', () => {
        it('should set the value and unit correctly', () => {
            const measurement = new Measurement(10, 'km');
            assert.strictEqual(measurement.value, 10);
            assert.strictEqual(measurement.unit, 'km');
        });

        it('should correct the unit name', () => {
            const measurement = new Measurement(20, 'Cel');
            assert.strictEqual(measurement.unit, '°C');
        });

        it('should determine if the unit is convertible', () => {
            const measurement1 = new Measurement(30, 'km');
            assert.strictEqual(measurement1.isConvertible, true);

            const measurement2 = new Measurement(40, 'V');
            assert.strictEqual(measurement2.isConvertible, false);
        });
    });

    describe('convertValue', () => {
        it('should convert the value correctly for °C to °F', () => {
            const convertedValue = Measurement.convertValue(25, '°C');
            assert.strictEqual(convertedValue, 77);
        });

        it('should convert the value correctly for km to mi', () => {
            const convertedValue = Measurement.convertValue(100, 'km');
            assert.strictEqual(convertedValue, 62.1);
        });

        it('should convert the value correctly for kPa to psi', () => {
            const convertedValue = Measurement.convertValue(200, 'kPa');
            assert.strictEqual(convertedValue, 29);
        });

        it('should convert the value correctly for km/L(e) to mpg(e)', () => {
            const convertedValue = Measurement.convertValue(10, 'km/L(e)');
            assert.strictEqual(convertedValue, 23.5);
        });

        it('should convert the value correctly for km/L to mpg', () => {
            const convertedValue = Measurement.convertValue(15, 'km/L');
            assert.strictEqual(convertedValue, 35.3);
        });

        it('should convert the value correctly for L to gal', () => {
            const convertedValue = Measurement.convertValue(50, 'L');
            assert.strictEqual(convertedValue, 13.2);
        });
    });

    describe('convertUnit', () => {
        it('should convert the unit correctly for °C to °F', () => {
            const convertedUnit = Measurement.convertUnit('°C');
            assert.strictEqual(convertedUnit, '°F');
        });

        it('should convert the unit correctly for km to mi', () => {
            const convertedUnit = Measurement.convertUnit('km');
            assert.strictEqual(convertedUnit, 'mi');
        });

        it('should convert the unit correctly for kPa to psi', () => {
            const convertedUnit = Measurement.convertUnit('kPa');
            assert.strictEqual(convertedUnit, 'psi');
        });

        it('should convert the unit correctly for km/L(e) to mpg(e)', () => {
            const convertedUnit = Measurement.convertUnit('km/L(e)');
            assert.strictEqual(convertedUnit, 'mpg(e)');
        });

        it('should convert the unit correctly for km/L to mpg', () => {
            const convertedUnit = Measurement.convertUnit('km/L');
            assert.strictEqual(convertedUnit, 'mpg');
        });

        it('should convert the unit correctly for L to gal', () => {
            const convertedUnit = Measurement.convertUnit('L');
            assert.strictEqual(convertedUnit, 'gal');
        });
    });

    describe('toString', () => {
        it('should return the string representation of the measurement', () => {
            const measurement = new Measurement(50, 'km');
            assert.strictEqual(measurement.toString(), '50km');
        });
    });
});