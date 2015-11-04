// process.env.NODE_ENV = 'development';

var assert = require('assert');
var _ = require('lodash');

var config = require('../app/config-tools');

config.init(function(timeTableData) {

  describe('config-tools.js', function() {

    describe('function getTimeTableTemp()', function() {

      describe('Workday', function() {
        it('Should have temp from workday morning preset', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446617700000), // 11/4/2015, 7:15:00 AM
            timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('morning').value()].temp);
        });
      });

      describe('Weekend', function() {
        it('Should have temp from weekend evening preset', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446404400000), // 11/1/2015, 8:00:00 PM
            timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('evening').value()].temp);
        });

        it('Should have Saturday morning temp be from previous (Friday night) preset', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1382133603000), // 10/19/2013, 00:00:03 AM
            timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('night').value()].temp);
        });
      });

      describe('var skipCurrentSwitch', function() {
        before('turn skip on', function() {
          config.skipCurrentSwitch = true;
        });

        it('Should skip temp from Sunday evening preset and take the one from Sunday night', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446404400000), // 11/1/2015, 8:00:00 PM
            timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('night').value()].temp);
        });

        it('Should reset skip and fallback to current preset (from Sunday night)', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446416400000), // 11/1/2015, 11:20:00 PM
            timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('night').value()].temp);
          assert.strictEqual(
            config.skipCurrentSwitch,
            false);
        });
      });

      describe('var skipCurrentSwitch (cont)', function() {
        before('turn skip on', function() {
          config.skipCurrentSwitch = true;
        });

        it('Should skip temp from Sunday night preset and take the one from Monday morning (initial)', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446417000000), // 11/1/2015, 11:30:00 PM
            timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('morning').value()].temp);
        });

        it('Should skip temp from Sunday night preset and take the one from Monday morning (subsequent)', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446417600000), // 11/1/2015, 11:40:00 PM
            timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('morning').value()].temp);
        });

        it('Should reset skip and take the temp from Monday morning', function() {
          assert.strictEqual(
            config.getTimeTableTemp(1446442800000), // 11/2/2015, 6:40:00 AM
            timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('morning').value()].temp);
          assert.strictEqual(
            config.skipCurrentSwitch,
            false);
        });

      });
    });

    describe('function shouldStartHeating()', function() {

      describe('Simple', function() {

        it('Should not start heating when temp_living > temp_preset', function() {
          var millis = 1446617700000; // 11/4/2015, 7:15:00 AM
          var temp_preset = timeTableData.workday[_.chain(timeTableData.workday).pluck('name').indexOf('morning').value()].temp;
          var temp_living = temp_preset + 1;
          var temp_osijek = 0;
          assert.strictEqual(
            config.shouldStartHeating(millis, temp_preset, temp_living, temp_osijek),
            false
          );
        });

        it('Should not start heating when temp_living = temp_preset', function() {
          var millis = 1446404400000; // 11/1/2015, 8:00:00 PM
          var temp_preset = timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('evening').value()].temp;
          var temp_living = temp_preset;
          var temp_osijek = 0;
          assert.strictEqual(
            config.shouldStartHeating(millis, temp_preset, temp_living, temp_osijek),
            false
          );
        });
      });

      describe('Predictive', function() {
        // Cph = 3 - (0.1 * delta);
        // Cph = 3 - (0.1 * target.temp - temp_osijek);
        // Cph = 3 - (0.1 * (20 - 0)) = 1;

        // tempDiffToReach = target.temp - temp_living;
        // tempDiffToReach = 20 - 18 = 2;

        // timeToReachTempDiff = tempDiffToReach / Cph;
        // timeToReachTempDiff = 2 / 1 = 2;

        it('Should not start heating as we have 7h until next preset and 2h is needed to reach the diff/delta', function() {
          var millis = 1446417000000; // 11/1/2015, 11:30:00 PM
          var temp_preset = timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('night').value()].temp;
          var temp_living = temp_preset + 1;
          var temp_osijek = 0;
          assert.strictEqual(
            config.shouldStartHeating(millis, temp_preset, temp_living, temp_osijek),
            false
          );
        });

        it('Should not start heating as we have 2h 15m until next preset and 2h is needed to reach the diff/delta', function() {
          var millis = 1446434100000; // 11/2/2015, 4:15:00 AM
          var temp_preset = timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('night').value()].temp;
          var temp_living = temp_preset + 1;
          var temp_osijek = 0;
          assert.strictEqual(
            config.shouldStartHeating(millis, temp_preset, temp_living, temp_osijek),
            false
          );
        });

        it('Should start heating as we have < 2h until next preset and 2h is needed to reach the diff/delta', function() {
          var millis = 1446436800000; // 11/2/2015, 5:00:00 AM
          var temp_preset = timeTableData.weekend[_.chain(timeTableData.weekend).pluck('name').indexOf('night').value()].temp;
          var temp_living = temp_preset + 1;
          var temp_osijek = 0;
          assert.strictEqual(
            config.shouldStartHeating(millis, temp_preset, temp_living, temp_osijek),
            true
          );
        });

      });
    });

  });

  run(); // exec as: mocha --delay
});