var gpio = require("pi-gpio");

var pin;

var init = function(thePin) {
  console.log('gpio-tools.init(' + thePin + ')');
  pin = thePin;

  gpio.close(pin);

  gpio.open(pin, "out");
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
exports.getValue = getValue;
exports.setValue = setValue;
exports.exitGracefully = exitGracefully;