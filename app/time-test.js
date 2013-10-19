var fs = require('fs');

var timetable_file_name = 'timetable.json';
var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";

var timeTableData;

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
        // console.log(timeTableData);
      }

      if (typeof(cb) == "function") {
        cb();
      }
    });
  }
};

var getTimeTableTemp = function() {
  console.log("config-tools.getTimeTableTemp()");

  var now = new Date(1382133603000);
  console.log('  now=' + now);
  var presets;

  if (now.isWeekday()) {
    presets = timeTableData.weekday;
  } else {
    presets = timeTableData.weekend;
  }

  var currHour = now.getHours();
  console.log('  currHour=' + currHour);
  var currMinute = now.getMinutes();
  console.log('  currMinute=' + currMinute);

  var matchingPreset;
  for (var i = presets.length - 1; i >= 0; i--) {
    console.log('  presets[' + i + ']=');
    console.log(presets[i]);
    var presetHour = presets[i].from[0];
    var presetMinute = presets[i].from[1];
    if (presetHour > currHour) {
      console.log('  1 future --> continue search');
    } else if (presetHour == currHour && presetMinute > currMinute) {
      console.log('  2 future --> continue search');
    } else {
      if (i != presets.length) {
        matchingPreset = presets[i];
      } else {
        matchingPreset = presets[0];
      }
      break;
    }

    if (i == 0) {
      // time < first preset today = time > last preset yesterday
      console.log('  continuation of "night" from previous day');
      var yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      console.log('  yesterday=' + yesterday);
      if (yesterday.isWeekday()) {
        presets = timeTableData.weekday;
      } else {
        presets = timeTableData.weekend;
      }

      matchingPreset = presets[presets.length - 1];
    }
  }
  console.log('  matchingPreset=');
  console.log(matchingPreset);

  console.log('  matchingPreset.temp=' + matchingPreset.temp);
  return matchingPreset.temp;
};

(function() {
  readTimeTable(function(argument) {
    getTimeTableTemp();
  });
})();