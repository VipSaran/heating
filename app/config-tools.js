var fs = require('fs');

var config_file_name = 'config.json';
var rrd_temps_name = "heating.rrd";
var rrd_state_name = "heating_state.rrd";
var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";
var img_dir = project_dir + "/assets-local/img";

var heatingSwitch;

var readConfig = function(cb) {
  console.log("config-tools.readConfig()");

  fs.readFile(app_dir + '/' + config_file_name, 'utf8', function(err, data_json) {
    if (err) {
      console.error(err);
      heatingSwitch = true;
    } else {
      var data = JSON.parse(data_json);
      console.log(data);
      heatingSwitch = data.heatingSwitch;
    }

    if (typeof(cb) == "function") {
      cb();
    }
  });
}

var writeConfig = function(cb) {
  console.log("config-tools.writeConfig()");

  var config = {
    "heatingSwitch": heatingSwitch
  };

  fs.writeFile(app_dir + '/' + config_file_name, JSON.stringify(config), function(err) {
    if (err) {
      console.error(err);
    } else {
      console.log('  config.json written');
    }
    if (typeof(cb) == "function") {
      cb();
    }
  });
}

Object.defineProperty(exports, "heatingSwitch", {
  get: function() {
    return heatingSwitch;
  },
  set: function(value) {
    heatingSwitch = value;
  }
});

exports.app_dir = app_dir; // read-only var
exports.rrd_temps_name = rrd_temps_name; // read-only var
exports.rrd_state_name = rrd_state_name; // read-only var
exports.img_dir = img_dir; // read-only var
exports.readConfig = readConfig;
exports.writeConfig = writeConfig;