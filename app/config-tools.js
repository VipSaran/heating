var fs = require('fs');

var config_file_name = 'config.json';
var timetable_file_name = 'timetable.json';
var rrd_temps_name = "heating.rrd";
var rrd_state_name = "heating_state.rrd";
var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";
var img_dir = project_dir + "/assets-local/img";

var timeTableData;
var heatingSwitch;

(function() {
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  Date.prototype.getMonthName = function() {
    return months[this.getMonth()];
  };
  Date.prototype.getDayName = function() {
    return days[this.getDay()];
  };
  Date.prototype.isWeekday = function() {
    return (this.getDay() > 0 && this.getDay() < 6);
  };
})();

var init = function(cb) {
  console.log("config-tools.init()");

  readConfig(function() {
    readTimeTable(cb);
  });
};

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
};

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
};

Object.defineProperty(exports, "heatingSwitch", {
  get: function() {
    return heatingSwitch;
  },
  set: function(value) {
    heatingSwitch = value;
  }
});


var readTimeTable = function(cb) {
  console.log("config-tools.readTimeTable()");

  if (typeof timeTableData != 'undefined') {
    if (typeof(cb) == "function") {
      cb(timeTableData);
    }
  } else {
    fs.readFile(app_dir + '/' + timetable_file_name, 'utf8', function(err, data_json) {
      if (err) {
        console.error(err);
        timeTableData = null;
      } else {
        timeTableData = JSON.parse(data_json);
        console.log(timeTableData);
      }

      if (typeof(cb) == "function") {
        cb();
      }
    });
  }
};

var getTimeTableTemp = function() {
  console.log("config-tools.getTimeTableTemp()");

  var now = new Date();
  var presets;

  if (now.isWeekday()) {
    presets = timeTableData.weekday;
  } else {
    presets = timeTableData.weekend;
  }

  var currHour = now.getHours();
  var currMinute = now.getMinutes();

  var matchingPreset;
  for (var i = presets.length - 1; i >= 0; i--) {
    // console.log('  presets[' + i + ']=');
    // console.log(presets[i]);
    var presetHour = presets[i].from[0];
    var presetMinute = presets[i].from[1];
    if (presetHour > currHour) {
      // console.log('  1 future --> continue search');
    } else if (presetHour == currHour && presetMinute > currMinute) {
      // console.log('  2 future --> continue search');
    } else {
      if (i != presets.length) {
        matchingPreset = presets[i];
      } else {
        matchingPreset = presets[0];
      }
      break;
    }
  }
  // console.log('  matchingPreset=');
  // console.log(matchingPreset);

  console.log('  matchingPreset.temp=' + matchingPreset.temp);
  return matchingPreset.temp;
};

exports.app_dir = app_dir; // read-only var
exports.rrd_temps_name = rrd_temps_name; // read-only var
exports.rrd_state_name = rrd_state_name; // read-only var
exports.img_dir = img_dir; // read-only var
exports.init = init;
exports.writeConfig = writeConfig;
exports.getTimeTableTemp = getTimeTableTemp;