var gpio = require("pi-gpio");
var exec = require('child_process').exec;
var config = require('./config-tools');

// var pin;
var tempLivingSensorId = '28-000004d56dad';

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

  // pin = thePin;

  // gpio.close(pin);

  // gpio.open(pin, "out");
}

var getTempLiving = function(last_temp_living, cb) {
  console.log('gpio-tools.getTempLiving()', last_temp_living);
  // var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave | grep t= | cut -f2 -d= | awk '{print $1/1000}'";
  var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave";

  var tempLiving;
  execute(readStr, function(out, err) {
    if (err) {
      console.error(err);
      tempLiving = last_temp_living;
    } else {
      try {
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
      } catch (exception) {
        console.error('  ERROR: Exception caught while parsing: ', exception);
        tempLiving = last_temp_living;
      }
    }

    if (typeof(cb) == "function") {
      cb(tempLiving);
    }
  });
}

// var getValue = function(cb) {
//   console.log('gpio-tools.getValue()');
//   gpio.read(pin, function(err, value) {
//     if (err) throw err;
//     console.log(value);
//     if (typeof(cb) == "function") {
//       cb(value);
//     }
//   });
// }

// var setValue = function(value, cb) {
//   console.log('gpio-tools.setValue(' + value + ')');
//   gpio.write(pin, value, function(err) {
//     if (err) throw err;
//     if (typeof(cb) == "function") {
//       cb();
//     }
//   });
// }


var dummyHeaterState = true;
var pumpOffTimeout;

var getHeaterState = function(cb) {
  console.log('gpio-tools.getHeaterState()');
  // TODO return actual GPIO heating relay state & delete dummyHeaterState var
  if (typeof(cb) == "function") {
    cb(dummyHeaterState);
  }
}

var regulateHeating = function(turnOn) {
  console.log('gpio-tools.regulateHeating()', turnOn);

  if (!config.heatingSwitch) {
    getHeaterState(function(heaterState) {
      console.log('  heaterState=', heaterState);
      if (heaterState) {
        // set heater 0 & delete dummyHeaterState var
        dummyHeaterState = false;
        console.log('  setHeater(0)');
      }
    });

    console.log('  heating is switched off --> skip regulating');
    return;
  }

  getHeaterState(function(heaterState) {
    console.log('  heaterState=', heaterState);
    if (turnOn) {
      if (!heaterState) {
        clearTimeout(pumpOffTimeout);

        // set pump 1
        console.log('  setPump(1)');

        setTimeout(function() {

          // set heater 1 & delete dummyHeaterState var
          dummyHeaterState = true;
          console.log('  setHeater(1)');

        }, 3000); // 3s
      }
    } else {
      if (heaterState) {

        // set heater 0 & delete dummyHeaterState var
        dummyHeaterState = false;
        console.log('  setHeater(0)');

        pumpOffTimeout = setTimeout(function() {

          // set pump 0
          console.log('  setPump(0)');

        }, 300000); // 300.000 = 5 min
      }
    }
  });
}

// a soft switch enabling or disabling the regulation
// only overrides temperature regulation for switched off state
var switchHeating = function(turnOn) {
  console.log('gpio-tools.switchHeating()', turnOn);

  if (!turnOn) {
    getHeaterState(function(heaterState) {
      console.log('  heaterState=', heaterState);
      if (heaterState) {

        // set heater 0 & delete dummyHeaterState var
        dummyHeaterState = false;
        console.log('  setHeater(0)');

        pumpOffTimeout = setTimeout(function() {

          // set pump 0
          console.log('  setPump(0)');

        }, 10000); // 10.000 = 10 s
      }
    });
  }
}

var exitGracefully = function(cb) {
  console.log('gpio-tools.exitGracefully()');
  // gpio.write(pin, 0, function(err) {
  //   if (err) throw err;
  //   gpio.close(pin); // then close pin 11
  //   console.log('  Closed the GPIO pin ' + pin);

  if (typeof(cb) == "function") {
    cb();
  }
  // });
}

exports.init = init;
exports.getTempLiving = getTempLiving;
exports.getHeaterState = getHeaterState;
exports.regulateHeating = regulateHeating;
exports.switchHeating = switchHeating;
exports.exitGracefully = exitGracefully;