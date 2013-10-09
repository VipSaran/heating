var gpio = require("pi-gpio");
var exec = require('child_process').exec;

var pin;
var tempLivingSensorId = '28-000004d56dad';
var cachedTempLiving = 23.0;

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    console.log("command: " + command);
    console.log("error: " + error);
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
    callback(stdout, stderr);
  });
};

var init = function(thePin) {
  console.log('gpio-tools.init(' + thePin + ')');
  pin = thePin;

  gpio.close(pin);

  gpio.open(pin, "out");
}

var getTempLiving = function(cb) {
  console.log('gpio-tools.getTempLiving()');
  var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave | grep t= | cut -f2 -d= | awk '{print $1/1000}'";

  var tempLiving;
  execute(readStr, function(out, err) {
    if (err) {
      console.error(err);
      tempLiving = cachedTempLiving;
    } else if (out == 0 || out == "0") {
      console.error('  Sensor returned 0.');
      tempLiving = cachedTempLiving;
    } else if ((out * 1) < -30 || (out * 1) > 40) {
      console.error('  Invalid sensor readout: ' + out);
      tempLiving = cachedTempLiving;
    } else {
      // console.error('  living room sensor readout: ' + out);
      tempLiving = parseFloat(out).toFixed(1);
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


// a soft switch enabling or disabling the regulation
// only overrides temperature regulation for switched off state
var heatingSwitch = true;

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
  console.log('gpio-tools.regulateHeating(' + turnOn + ')');

  if (!heatingSwitch) {
    console.log('  heating is switched off --> skip regulating');
    return;
  }

  getHeaterState(function(heaterState) {
    console.log('  heaterState=' + heaterState);
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

var getHeatingSwitch = function(cb) {
  console.log('gpio-tools.getHeatingSwitch()');

  if (typeof(cb) == "function") {
    cb(heatingSwitch);
  }
}

var switchHeating = function(turnOn, cb) {
  console.log('gpio-tools.switchHeating(' + turnOn + ')');

  heatingSwitch = turnOn;

  if (!turnOn) {
    getHeaterState(function(heaterState) {
      console.log('  heaterState=' + heaterState);
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

  if (typeof(cb) == "function") {
    getHeatingSwitch(cb);
  }
}

var exitGracefully = function(cb) {
  console.log('gpio-tools.exitGracefully()');
  gpio.write(pin, 0, function(err) {
    if (err) throw err;
    gpio.close(pin); // then close pin 11
    console.log('  Closed the GPIO pin ' + pin);

    if (typeof(cb) == "function") {
      cb();
    }
  });
}

exports.init = init;
exports.getTempLiving = getTempLiving;
exports.getHeaterState = getHeaterState;
exports.regulateHeating = regulateHeating;
exports.getHeatingSwitch = getHeatingSwitch;
exports.switchHeating = switchHeating;
exports.exitGracefully = exitGracefully;