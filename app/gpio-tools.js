var async = require('async');
var gpio = require("pi-gpio");
var exec = require('child_process').exec;
var config = require('./config-tools');
var logger = config.logger;

var gpioPinHeater = 11; // header pin 11 = BCM GPIO 17 = GPIO/wiringPi 0
var gpioPinPump = 12; // header pin 12 = BCM GPIO 18 = GPIO/wiringPi 1

var tempLivingSensorId = '28-000004d56dad'; // on 1-wire bus
var tempPlaySensorId = '28-00000505081c'; // on 1-wire bus
// var tempLivingSensorId = '28.AD6DD5040000'; // on 1-wire master
// var tempPlaySensorId = '28.1C0805050000'; // on 1-wire master
// var tempBasementSensorId = '28.FDA005050000'; // on 1-wire master

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    logger.debug("  command: ", command);
    logger.debug("  error: ", error);
    logger.debug("  stdout: ", stdout);
    logger.debug("  stderr: ", stderr);
    callback(stdout, stderr);
  });
}

var init = function() {
  logger.info('gpio-tools.init()');

  // init 1-wire master
  // var init_owserver = "/opt/owfs/bin/owserver --i2c=/dev/i2c-1:ALL"
  // execute(init_owserver, function(out, err) {
  //   if (err) {
  //     logger.error(err);
  //   }
  // });

  gpio.close(gpioPinHeater, function(err) {
    if (err) {
      logger.error(err);
    } else {
      logger.debug('  Closed pin', gpioPinHeater);
    }
  });

  gpio.close(gpioPinPump, function(err) {
    if (err) {
      logger.error(err);
    } else {
      logger.debug('  Closed pin', gpioPinPump);
    }
  });

  async.series([

    function(callback) {

      gpio.open(gpioPinHeater, "out", function(err) {
        callback(err, gpioPinHeater);
      });
    },
    function(callback) {

      gpio.open(gpioPinPump, "out", function(err) {
        callback(err, gpioPinPump);
      });
    }
  ], function(err, results) {
    if (err) {
      logger.error(err);
    } else {
      logger.debug('  Opened GPIO pins', results);
    }
  });
};

var getTempLiving = function(last_temp_living, cb) {
  logger.info('gpio-tools.getTempLiving()', last_temp_living);
  var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave";
  // var readStr = "/opt/owfs/bin/owread " + tempLivingSensorId + "/temperature";

  var bus = true; // else master

  var tempLiving;
  execute(readStr, function(out, err) {
    if (err) {
      logger.error(err);
      tempLiving = last_temp_living;
    } else {
      try {
        if (bus) {
          var lines = out.replace(/\r\n/g, "\n").split("\n");
          // logger.debug(lines);

          if (lines == null || lines.length != 3) {
            logger.error('Wrong sensor readout format.');
            tempLiving = last_temp_living;
          } else {
            var crc_OK = lines[0].substring(lines[0].length - 3) == "YES";
            // logger.debug('  crc=', crc_OK);

            if (crc_OK) {
              var temp = lines[1].substring(lines[1].indexOf('t=') + 2);
              // logger.debug('  temp=', temp);

              if (!isNaN(temp)) {
                tempLiving = parseFloat((temp / 1000).toFixed(1));
                logger.debug('  tempLiving=', tempLiving);

                if (tempLiving < 1 || tempLiving > 30) {
                  logger.error('Value outside of reasonable range.');
                  tempLiving = last_temp_living;
                }
              } else {
                logger.error('Temperature value not a number.');
                tempLiving = last_temp_living;
              }
            } else {
              logger.error('Sensor readout CRC failed.');
              tempLiving = last_temp_living;
            }
          }
        } else {
          // logger.debug('  out=', out);
          var temp = out.replace(/^\s+|\s+$/g, '');
          // logger.debug('  temp=', temp);

          if (!isNaN(temp)) {
            tempLiving = parseFloat((temp * 1).toFixed(1));
            logger.debug('  tempLiving=', tempLiving);

            if (tempLiving < 1 || tempLiving > 30) {
              logger.error('Value outside of reasonable range.');
              tempLiving = last_temp_living;
            }
          } else {
            logger.error('Temperature value not a number.');
            tempLiving = last_temp_living;
          }
        }
      } catch (exception) {
        logger.error('Exception caught while parsing: ', exception);
        tempLiving = last_temp_living;
      }
    }

    if (typeof(cb) == "function") {
      cb(tempLiving);
    }
  });
};

var pumpOffTimeout;

var getHeaterState = function(cb) {
  logger.debug('gpio-tools.getHeaterState()');

  gpio.read(gpioPinHeater, function(err, value) {
    if (err) throw err;
    logger.debug('  heaterState=', value);
    if (typeof(cb) == "function") {
      cb(value);
    }
  });
};

var setHeaterState = function(value, cb) {
  logger.debug('gpio-tools.setHeaterState()', value);
  gpio.write(gpioPinHeater, value, function(err) {
    if (err) throw err;

    logger.debug('  Heater set to', value);

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var getPumpState = function(cb) {
  logger.debug('gpio-tools.getPumpState()');

  gpio.read(gpioPinPump, function(err, value) {
    if (err) throw err;
    logger.debug('  pumpState=', value);
    if (typeof(cb) == "function") {
      cb(value);
    }
  });
};

var setPumpState = function(value, cb) {
  logger.debug('gpio-tools.setPumpState()', value);
  gpio.write(gpioPinPump, value, function(err) {
    if (err) throw err;

    logger.debug('  Pump set to', value);

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var regulateHeating = function(turnOn) {
  logger.debug('gpio-tools.regulateHeating()', turnOn);

  if (!config.heatingSwitch) {
    getHeaterState(function(heaterState) {
      if (heaterState) {
        setHeaterState(0);
      }
    });

    logger.debug('  heating is switched off --> skip regulating');
    return;
  }

  getHeaterState(function(heaterState) {
    if (turnOn) {
      if (!heaterState) {
        clearTimeout(pumpOffTimeout);

        setPumpState(1);

        setTimeout(function() {
          setHeaterState(1);
        }, 3000); // 3s
      } else {
        getPumpState(function(pumpState) {
          if (!pumpState) {
            setPumpState(1);
          }
        });
      }
    } else {
      if (heaterState) {

        setHeaterState(0);

        pumpOffTimeout = setTimeout(function() {
          setPumpState(0);
        }, config.delay_pump_off);
      }
    }
  });
};

// a soft switch enabling or disabling the regulation
// only overrides temperature regulation for switched off state
var switchHeating = function(turnOn) {
  logger.debug('gpio-tools.switchHeating()', turnOn);

  if (!turnOn) {
    getHeaterState(function(heaterState) {
      if (heaterState) {
        clearTimeout(pumpOffTimeout);

        setHeaterState(0);

        pumpOffTimeout = setTimeout(function() {
          setPumpState(0);
        }, 10000); // 10.000 = 10 s
      }
    });
  }
};

var exitGracefully = function(cb) {
  logger.debug('gpio-tools.exitGracefully()');

  async.series([

    function(callback) {
      gpio.write(gpioPinHeater, 0, function(err) {
        logger.debug('  Closing pin', gpioPinHeater);
        gpio.close(gpioPinHeater);
        callback(err, gpioPinHeater);
      });
    },
    function(callback) {
      gpio.write(gpioPinPump, 0, function(err) {
        logger.debug('  Closing pin', gpioPinPump);
        gpio.close(gpioPinPump);
        callback(err, gpioPinPump);
      });
    }
  ], function(err, results) {
    if (err) {
      logger.error('Error shutting down relay pins', err);
    } else {
      logger.debug('Closed GPIO pins', results);
    }

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

exports.init = init;
exports.getTempLiving = getTempLiving;
exports.getHeaterState = getHeaterState;
exports.regulateHeating = regulateHeating;
exports.switchHeating = switchHeating;
exports.exitGracefully = exitGracefully;