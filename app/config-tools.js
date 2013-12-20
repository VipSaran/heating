var fs = require('fs');

var config_file_name = 'config.json';
var timetable_file_name = 'timetable.json';
var rrd_temps_name = "heating.rrd";
var rrd_state_name = "heating_state.rrd";
var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";
var img_dir = project_dir + "/assets-local/img";

var regulate_interval = 30000; // 30.000 = 30 s
var collect_record_interval = 120000; // 120.000 = 2 min
var delay_pump_off = 300000; // 300.000 = 5 min

var timeTableData;
var overrideSwitch;
var heatingSwitch;
var holidaySwitch;

(function() {
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  Date.prototype.getMonthName = function() {
    return months[this.getMonth()];
  };
  Date.prototype.getDayName = function() {
    return days[this.getDay()];
  };
  Date.prototype.isWorkday = function() {
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
      console.error('  error=', err);
      overrideSwitch = false;
      heatingSwitch = true;
      holidaySwitch = false;
    } else {
      var data = JSON.parse(data_json);
      console.log('  config=', data);
      overrideSwitch = data.overrideSwitch;
      heatingSwitch = data.heatingSwitch;
      holidaySwitch = data.holidaySwitch;
    }

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var writeConfig = function(cb) {
  console.log("config-tools.writeConfig()");

  var config = {
    "overrideSwitch": overrideSwitch,
    "heatingSwitch": heatingSwitch,
    "holidaySwitch": holidaySwitch
  };

  fs.writeFile(app_dir + '/' + config_file_name, JSON.stringify(config), function(err) {
    if (err) {
      console.error('  error=', err);
    } else {
      console.log('  config.json written');
    }
    if (typeof(cb) == "function") {
      cb();
    }
  });
};

Object.defineProperty(exports, "overrideSwitch", {
  get: function() {
    return overrideSwitch;
  },
  set: function(value) {
    overrideSwitch = value;
    writeConfig();
  }
});

Object.defineProperty(exports, "heatingSwitch", {
  get: function() {
    return heatingSwitch;
  },
  set: function(value) {
    heatingSwitch = value;
    writeConfig();
  }
});

Object.defineProperty(exports, "holidaySwitch", {
  get: function() {
    return holidaySwitch;
  },
  set: function(value) {
    holidaySwitch = value;
    writeConfig();
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
        console.error('  error=', err);
        timeTableData = null;
      } else {
        timeTableData = JSON.parse(data_json);
        console.log("  time-table data=", timeTableData);
      }

      if (typeof(cb) == "function") {
        cb();
      }
    });
  }
};

var getTimeTableTemp = function(millis) {
  console.log("config-tools.getTimeTableTemp()");

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  // console.log('  now=', now);
  var presets;

  if (!holidaySwitch && now.isWorkday()) {
    presets = timeTableData.workday;
  } else {
    presets = timeTableData.weekend;
  }

  var currHour = now.getHours();
  // console.log('  currHour=', currHour);
  var currMinute = now.getMinutes();
  // console.log('  currMinute=', currMinute);

  var matchingPreset;
  for (var i = presets.length - 1; i >= 0; i--) {
    // console.log('  presets[' + i + ']=', presets[i]);
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

    if (i == 0) {
      // time < first preset today = time > last preset yesterday
      // console.log('  continuation of "night" from previous day');
      var yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      // console.log('  yesterday=', yesterday);
      if (yesterday.isWorkday()) {
        presets = timeTableData.workday;
      } else {
        presets = timeTableData.weekend;
      }

      matchingPreset = presets[presets.length - 1];
    }
  }
  // console.log('  matchingPreset=', matchingPreset);

  console.log('  matchingPreset.temp=', matchingPreset.temp);
  return matchingPreset.temp;
};

var getNextTimeTable = function(millis) {
  console.log("config-tools.getNextTimeTable()");

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  // console.log('  now=', now);
  var presets;

  if (now.isWorkday()) {
    presets = timeTableData.workday;
  } else {
    presets = timeTableData.weekend;
  }

  var currHour = now.getHours();
  // console.log('  currHour=', currHour);
  var currMinute = now.getMinutes();
  // console.log('  currMinute=', currMinute);

  var futurePreset;
  for (var i = presets.length - 1; i >= 0; i--) {
    console.log('  presets[' + i + ']=', presets[i]);

    var presetHour = presets[i].from[0];
    var presetMinute = presets[i].from[1];
    if (presetHour > currHour) {
      console.log('  1 future --> continue search');
      futurePreset = presets[i];
    } else if (presetHour == currHour && presetMinute > currMinute) {
      console.log('  2 future --> continue search');
      futurePreset = presets[i];
    } else if (futurePreset !== undefined) {
      console.log('  break');
      break;
    }

    if (i == 0 && futurePreset === undefined) {
      // time > last preset today = time < first preset tomorrow
      console.log('  target is "morning" of next day');
      var tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      console.log('  tomorrow=', tomorrow);
      if (tomorrow.isWorkday()) {
        presets = timeTableData.workday;
      } else {
        presets = timeTableData.weekend;
      }

      futurePreset = presets[0];
    }
  }
  // console.log('  futurePreset=', futurePreset);

  // console.log('  futurePreset.temp=', futurePreset.temp);

  // console.log('## elapsed:', new Date().getTime() - now.getTime());
  return futurePreset;
};

var shouldStartHeating = function(millis, temp_preset, temp_living, temp_osijek) {
  console.log("config-tools.shouldStartHeating()", temp_preset, temp_living, temp_osijek);

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  // console.log('  now=', now);

  var should = false;
  if (temp_preset > temp_living) {
    console.log('  heating needed now');
    should = true;
  } else {
    // we're above preset temp, but next preset could require heating --> check it
    var target = getNextTimeTable(now);
    console.log('  target=', target);

    if (target.temp > temp_living && target.temp > temp_preset) {
      // see how much we should heat
      var tempDiffToReach = parseFloat(target.temp - temp_living).toFixed(2);
      console.log('  tempDiffToReach=', tempDiffToReach);

      var delta = temp_living - temp_osijek;
      console.log('  delta=', delta);

      var Cph = 3 - (0.1 * delta);
      console.log('  Cph=', Cph);

      // see how long to reach that heat
      var timeToReachTempDiff = parseFloat(tempDiffToReach / Cph).toFixed(2);
      console.log('  timeToReachTempDiff=', timeToReachTempDiff, 'hours');

      var hourMillis = 60 * 60 * 1000;
      var timeToReachTempDiffMillis = Math.round(timeToReachTempDiff * hourMillis);
      console.log('  timeToReachTempDiffMillis=', timeToReachTempDiffMillis);

      var target_hour = target.from[0];
      var target_minute = target.from[1];
      // is target is tomorrow, add 1 day
      var target_date = new Date(now.getFullYear(), now.getMonth(), target_hour < now.getHours() ? now.getDate() + 1 : now.getDate(), target_hour, target_minute, 0, 0);
      console.log('  target_date=', target_date);
      console.log('  target_date_millis=', target_date.getTime());
      var shouldStartAt = target_date.getTime() - timeToReachTempDiffMillis;
      console.log('  shouldStartAt_millis=', shouldStartAt);
      console.log('  shouldStartAt=', new Date(shouldStartAt));
      console.log('  now=', now.getTime());

      if (shouldStartAt < now.getTime()) {
        console.log('  heating needed now to reach goal (' + tempDiffToReach + ' C) in ' + timeToReachTempDiff + ' h');
        should = true;
      }
    }
  }

  console.log('  shouldStartHeating=', should);
  return should;
};

exports.app_dir = app_dir; // read-only var
exports.rrd_temps_name = rrd_temps_name; // read-only var
exports.rrd_state_name = rrd_state_name; // read-only var
exports.img_dir = img_dir; // read-only var
exports.regulate_interval = regulate_interval; // read-only var
exports.collect_record_interval = collect_record_interval; // read-only var
exports.delay_pump_off = delay_pump_off; // read-only var
exports.init = init;
exports.writeConfig = writeConfig;
exports.getTimeTableTemp = getTimeTableTemp;
exports.shouldStartHeating = shouldStartHeating;