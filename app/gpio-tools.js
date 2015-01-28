var async = require('async');
var gpio = require("pi-gpio");
var exec = require('child_process').exec;
var config = require('./config-tools');

var gpioPinHeater = 11; // header pin 11 = BCM GPIO 17 = GPIO/wiringPi 0
var gpioPinPump = 12; // header pin 12 = BCM GPIO 18 = GPIO/wiringPi 1

var tempLivingSensorId = '28-000004d56dad'; // on 1-wire bus
var tempPlaySensorId = '28-00000505081c'; // on 1-wire bus
// var tempLivingSensorId = '28.AD6DD5040000'; // on 1-wire master
// var tempPlaySensorId = '28.1C0805050000'; // on 1-wire master
// var tempBasementSensorId = '28.FDA005050000'; // on 1-wire master

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    console.log("  command: ", command);
    console.log("  error: ", error);
    console.log("  stdout: ", stdout);
    console.log("  stderr: ", stderr);
    callback(stdout, stderr);
  });
}

var init = function() {
  console.log('gpio-tools.init()');

  // init 1-wire master
  // var init_owserver = "/opt/owfs/bin/owserver --i2c=/dev/i2c-1:ALL"
  // execute(init_owserver, function(out, err) {
  //   if (err) {
  //     console.error(err);
  //   }
  // });

  gpio.close(gpioPinHeater, function(err) {
    if (err) {
      console.error('  ERROR', err);
    } else {
      console.log('  Closed pin', gpioPinHeater);
    }
  });

  gpio.close(gpioPinPump, function(err) {
    if (err) {
      console.error('  ERROR', err);
    } else {
      console.log('  Closed pin', gpioPinPump);
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
      console.error('  ERROR', err);
    } else {
      console.log('  Opened GPIO pins', results);
    }
  });
};

var getTempLiving = function(last_temp_living, cb) {
  console.log('gpio-tools.getTempLiving()', last_temp_living);
  var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave";
  // var readStr = "/opt/owfs/bin/owread " + tempLivingSensorId + "/temperature";

  var bus = true; // else master

  var tempLiving;
  execute(readStr, function(out, err) {
    if (err) {
      console.error(err);
      tempLiving = last_temp_living;
    } else {
      try {
        if (bus) {
          var lines = out.replace(/\r\n/g, "\n").split("\n");
          // console.log(lines);

          if (lines == null || lines.length != 3) {
            console.error('  ERROR: Wrong sensor readout format.');
            tempLiving = last_temp_living;
          } else {
            var crc_OK = lines[0].substring(lines[0].length - 3) == "YES";
            // console.log('  crc=', crc_OK);

            if (crc_OK) {
              var temp = lines[1].substring(lines[1].indexOf('t=') + 2);
              // console.log('  temp=', temp);

              if (!isNaN(temp)) {
                tempLiving = parseFloat(temp / 1000).toFixed(1);
                console.log('  tempLiving=', tempLiving);

                if (tempLiving < 1 || tempLiving > 30) {
                  console.error('  ERROR: Value outside of reasonable range.');
                  tempLiving = last_temp_living;
                }
              } else {
                console.error('  ERROR: Temperature value not a number.');
                tempLiving = last_temp_living;
              }
            } else {
              console.error('  ERROR: Sensor readout CRC failed.');
              tempLiving = last_temp_living;
            }
          }
        } else {
          // console.log('  out=', out);
          var temp = out.replace(/^\s+|\s+$/g, '');
          // console.log('  temp=', temp);

          if (!isNaN(temp)) {
            tempLiving = parseFloat(temp).toFixed(1);
            console.log('  tempLiving=', tempLiving);

            if (tempLiving < 1 || tempLiving > 30) {
              console.error('  ERROR: Value outside of reasonable range.');
              tempLiving = last_temp_living;
            }
          } else {
            console.error('  ERROR: Temperature value not a number.');
            tempLiving = last_temp_living;
          }
        }
      } catch (exception) {
        console.error('  ERROR: Exception caught while parsing: ', exception);
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
  console.log('gpio-tools.getHeaterState()');

  gpio.read(gpioPinHeater, function(err, value) {
    if (err) throw err;
    console.log('  heaterState=', value);
    if (typeof(cb) == "function") {
      cb(value);
    }
  });
};

var setHeaterState = function(value, cb) {
  console.log('gpio-tools.setHeaterState()', value);
  gpio.write(gpioPinHeater, value, function(err) {
    if (err) throw err;

    console.log('  Heater set to', value);

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var getPumpState = function(cb) {
  console.log('gpio-tools.getPumpState()');

  gpio.read(gpioPinPump, function(err, value) {
    if (err) throw err;
    console.log('  pumpState=', value);
    if (typeof(cb) == "function") {
      cb(value);
    }
  });
};

var setPumpState = function(value, cb) {
  console.log('gpio-tools.setPumpState()', value);
  gpio.write(gpioPinPump, value, function(err) {
    if (err) throw err;

    console.log('  Pump set to', value);

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var regulateHeating = function(turnOn) {
  console.log('gpio-tools.regulateHeating()', turnOn);

  if (!config.heatingSwitch) {
    getHeaterState(function(heaterState) {
      if (heaterState) {
        setHeaterState(0);
      }
    });

    console.log('  heating is switched off --> skip regulating');
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
  console.log('gpio-tools.switchHeating()', turnOn);

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
  console.log('gpio-tools.exitGracefully()');

  async.series([

    function(callback) {
      gpio.write(gpioPinHeater, 0, function(err) {
        console.log('  Closing pin', gpioPinHeater);
        gpio.close(gpioPinHeater);
        callback(err, gpioPinHeater);
      });
    },
    function(callback) {
      gpio.write(gpioPinPump, 0, function(err) {
        console.log('  Closing pin', gpioPinPump);
        gpio.close(gpioPinPump);
        callback(err, gpioPinPump);
      });
    }
  ], function(err, results) {
    if (err) {
      console.error('ERROR shutting down relay pins', err);
    } else {
      console.log('Closed GPIO pins', results);
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