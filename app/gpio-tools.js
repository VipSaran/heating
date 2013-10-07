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
  var readStr = "cat /sys/bus/w1/devices/" + tempLivingSensorId + "/w1_slave | grep t= | cut -f2 -d= | awk '{print $1/1000}'";

  var tempLiving;
  execute(readStr, function(out, err) {
    if (err) {
      console.error(err);
      tempLiving = cachedTempLiving;
    } else {
      // console.error("living sensor readout: " + out);
      tempLiving = parseFloat(out).toFixed(1);
    }

    if (typeof(cb) == "function") {
      cb(tempLiving);
    }
  });
}

var getValue = function(cb) {
  console.log('gpio-tools.getValue()');
  gpio.read(pin, function(err, value) {
    if (err) throw err;
    console.log(value);
    if (typeof(cb) == "function") {
      cb(value);
    }
  });
}

var setValue = function(value, cb) {
  console.log('gpio-tools.setValue(' + value + ')');
  gpio.write(pin, value, function(err) {
    if (err) throw err;
    if (typeof(cb) == "function") {
      cb();
    }
  });
}

var exitGracefully = function(cb) {
  console.log('gpio-tools.exitGracefully()');
  gpio.write(pin, 0, function(err) {
    if (err) throw err;
    gpio.close(pin); // then close pin 11
    console.log('Closed the GPIO pin ' + pin);

    if (typeof(cb) == "function") {
      cb();
    }
  });
}

exports.init = init;
exports.getTempLiving = getTempLiving;
exports.getValue = getValue;
exports.setValue = setValue;
exports.exitGracefully = exitGracefully;