var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var winston = require('winston');
var consoleTransport = new(winston.transports.Console)();
consoleTransport.timestamp = true;
consoleTransport.showLevel = false;
var env = process.env.NODE_ENV || 'production';
if ('development' == env.trim()) {
  consoleTransport.level = 'debug';
  consoleTransport.colorize = true;
  consoleTransport.debugStdout = true;
} else {
  consoleTransport.level = 'error';
}
var logger = new(winston.Logger)({
  transports: [
    consoleTransport
  ]
});

var config_file_name = 'config.json';
var timetable_file_name = 'timetable.json';
var rrd_temps_name = "heating.rrd";
var rrd_state_name = "heating_state.rrd";

var root_dir = path.normalize(__dirname + '/..');
var app_dir = root_dir + '/app';
var public_dir = root_dir + "/public";
var img_dir = public_dir + "/img";

var scrobble_data_online = false;

var allow_unauthenticated_lan = true;

var use_average_temp = true;

var regulate_interval = 30000; // 30.000 = 30 s
var collect_record_interval = 120000; // 120.000 = 2 min
var delay_pump_off = 300000; // 300.000 = 5 min

var timeTableData;
var overrideSwitch;
var skipCurrentSwitch;
var heatingSwitch;
var holidaySwitch;

var skippedPreset;
var nextPreset;

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
  logger.info("config-tools.init()");

  readConfig(function() {
    readTimeTable(cb);
  });
};

var readConfig = function(cb) {
  logger.info("config-tools.readConfig()");

  fs.readFile(app_dir + '/' + config_file_name, 'utf8', function(err, data_json) {
    if (err) {
      logger.error(err);
      overrideSwitch = false;
      skipCurrentSwitch = false;
      heatingSwitch = true;
      holidaySwitch = false;
    } else {
      var data = JSON.parse(data_json);
      logger.debug('  config=', data);
      overrideSwitch = data.overrideSwitch;
      skipCurrentSwitch = data.skipCurrentSwitch;
      heatingSwitch = data.heatingSwitch;
      holidaySwitch = data.holidaySwitch;
    }

    if (typeof(cb) == "function") {
      cb();
    }
  });
};

var writeConfig = function(cb) {
  logger.info("config-tools.writeConfig()");

  var config = {
    "overrideSwitch": overrideSwitch,
    "skipCurrentSwitch": skipCurrentSwitch,
    "heatingSwitch": heatingSwitch,
    "holidaySwitch": holidaySwitch
  };

  try {
    fs.writeFileSync(app_dir + '/' + config_file_name, JSON.stringify(config));
    logger.debug('  config.json written');
  } catch (err) {
    logger.error(err);
  }
  if (typeof(cb) == "function") {
    cb();
  }
};

var readTimeTable = function(cb) {
  logger.info("config-tools.readTimeTable()");

  if (typeof timeTableData != 'undefined') {
    if (typeof(cb) == "function") {
      cb(timeTableData);
    }
  } else {
    fs.readFile(app_dir + '/' + timetable_file_name, 'utf8', function(err, data_json) {
      if (err) {
        logger.error(err);
        timeTableData = null;
      } else {
        timeTableData = JSON.parse(data_json);
        logger.debug("  time-table data=", timeTableData);
      }

      if (typeof(cb) == "function") {
        cb(timeTableData);
      }
    });
  }
};

var getTimeTableTemp = function(millis) {
  logger.info("config-tools.getTimeTableTemp()");

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  var presets = getPresets(now);

  var currHour = now.getHours();
  logger.debug('  currHour=', currHour);
  var currMinute = now.getMinutes();
  logger.debug('  currMinute=', currMinute);
  logger.debug('  currDay=', now.getDayName());

  var matchingPreset;
  var wasYesterday = false;
  for (var i = presets.length - 1; i >= 0; i--) {
    logger.debug('  presets[' + i + ']=', presets[i]);
    var presetHour = presets[i].from[0];
    var presetMinute = presets[i].from[1];
    if (presetHour > currHour) {
      logger.debug('  1 future --> continue search');
    } else if (presetHour == currHour && presetMinute > currMinute) {
      logger.debug('  2 future --> continue search');
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
      logger.debug('  continuation of "night" from previous day');
      var yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      var yesterday_presets = getPresets(yesterday);
      matchingPreset = yesterday_presets[yesterday_presets.length - 1];
      wasYesterday = true;
    }
  }
  logger.debug('  matchingPreset=', matchingPreset);

  if (skipCurrentSwitch) {
    logger.debug('  skipCurrentSwitch=true --> skippedPreset=', skippedPreset);
    if (skippedPreset == undefined) { // don't check type
      logger.debug('  skippedPreset == undefined');

      skippedPreset = _.extend({}, matchingPreset);
      logger.debug('  matchingPreset --> skippedPreset=', skippedPreset);

      // skip to next preset and use it as matchingPreset
      if (wasYesterday) {
        // the following preset from yesterdays last preset is first one from today
        nextPreset = presets[0];
      } else {
        var currentIndex = _.indexOf(presets, matchingPreset);
        var nextIndex = currentIndex + 1;
        if ((nextIndex + 1) > presets.length) {
          // overflow to next day
          var tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
          var tomorrow_presets = getPresets(tomorrow);
          nextPreset = tomorrow_presets[0];
        } else {
          nextPreset = presets[nextIndex];
        }
      }

      matchingPreset = _.extend({}, nextPreset);
    } else if (!_.isEqual(matchingPreset, skippedPreset)) {
      logger.debug('  skippedPreset != matchingPreset');
      // new preset came in, lift the skip switch
      exports.skipCurrentSwitch = false;
      skippedPreset = undefined;
      logger.debug('  skippedPreset=', skippedPreset);
      nextPreset = undefined;
      logger.debug('  nextPreset=', nextPreset);
    } else {
      matchingPreset = _.extend({}, nextPreset);
      logger.debug('  nextPreset --> matchingPreset=', nextPreset);
    }

    logger.debug('  matchingPreset=', matchingPreset);
  }

  logger.info('  matchingPreset.temp=', matchingPreset.temp);
  return matchingPreset.temp;
};

var getNextTimeTable = function(millis) {
  logger.info("config-tools.getNextTimeTable()");

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  var presets = getPresets(now);

  var currHour = now.getHours();
  logger.debug('  currHour=', currHour);
  var currMinute = now.getMinutes();
  logger.debug('  currMinute=', currMinute);

  var futurePreset;
  for (var i = presets.length - 1; i >= 0; i--) {
    logger.debug('  presets[' + i + ']=', presets[i]);

    var presetHour = presets[i].from[0];
    var presetMinute = presets[i].from[1];
    if (presetHour > currHour) {
      logger.debug('  1 future --> continue search');
      futurePreset = presets[i];
    } else if (presetHour == currHour && presetMinute > currMinute) {
      logger.debug('  2 future --> continue search');
      futurePreset = presets[i];
    } else if (futurePreset !== undefined) {
      logger.debug('  break');
      break;
    }

    if (i == 0 && futurePreset === undefined) {
      // time > last preset today = time < first preset tomorrow
      logger.debug('  target is "morning" of next day');
      var tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      var tomorrow_presets = getPresets(tomorrow);
      futurePreset = tomorrow_presets[0];
    }
  }

  // logger.debug('## elapsed:', new Date().getTime() - now.getTime());
  // logger.debug('  futurePreset=', futurePreset);
  return futurePreset;
};

function getPresets(now) {
  logger.info('config-tools.getPresets() for', now.toLocaleString());

  if (!holidaySwitch && now.isWorkday()) {
    presets = timeTableData.workday;
  } else {
    presets = timeTableData.weekend;
  }

  logger.debug('presets=', presets);
  return presets;
}

var shouldStartHeating = function(millis, temp_preset, temp_living, temp_osijek) {
  logger.info("config-tools.shouldStartHeating()", temp_preset, temp_living, temp_osijek);

  if (millis === undefined) {
    millis = new Date().getTime();
  }

  var now = new Date(millis);
  logger.debug('  now=', now.toLocaleString());

  var should = false;
  if (temp_preset > temp_living) {
    logger.debug('  heating needed now');
    should = true;
  } else {
    // we're above preset temp, but next preset could require heating --> check it
    var target = getNextTimeTable(now);
    logger.debug('  target=', target);

    if (target.temp > temp_living && target.temp > temp_preset) {
      // see how much we should heat
      var tempDiffToReach = parseFloat((target.temp - temp_living).toFixed(2));
      logger.debug('  tempDiffToReach=', tempDiffToReach);

      var delta = parseFloat((target.temp - temp_osijek).toFixed(2));
      logger.debug('  delta=', delta);

      var Cph = 3 - (0.1 * delta);
      logger.debug('  Cph=', Cph);
      if (Cph < 0.5) {
        Cph = 0.5;
        logger.debug('  Cph (corrected)=', Cph);
      }

      // see how long to reach that temp
      var timeToReachTempDiff = parseFloat((tempDiffToReach / Cph).toFixed(2));
      logger.debug('  timeToReachTempDiff=', timeToReachTempDiff, 'hours');

      var hourMillis = 60 * 60 * 1000;
      var timeToReachTempDiffMillis = Math.round(timeToReachTempDiff * hourMillis);
      logger.debug('  timeToReachTempDiffMillis=', timeToReachTempDiffMillis);

      var target_hour = target.from[0];
      var target_minute = target.from[1];
      // is target is tomorrow, add 1 day
      var target_date = new Date(now.getFullYear(), now.getMonth(), target_hour < now.getHours() ? now.getDate() + 1 : now.getDate(), target_hour, target_minute, 0, 0);
      logger.debug('  target_date=', target_date);
      logger.debug('  target_date_millis=', target_date.getTime());
      var shouldStartAt = target_date.getTime() - timeToReachTempDiffMillis;
      logger.debug('  shouldStartAt_millis=', shouldStartAt);
      logger.debug('  shouldStartAt=', new Date(shouldStartAt));
      logger.debug('  now=', now.getTime());

      if (shouldStartAt < now.getTime()) {
        logger.info('  heating needed now to reach goal (' + tempDiffToReach + ' C) in ' + timeToReachTempDiff + ' h');
        should = true;
      }
    }
  }

  logger.info('  shouldStartHeating=', should);
  return should;
};


// variables exported as functions
exports.init = init;
exports.writeConfig = writeConfig;
exports.getTimeTableTemp = getTimeTableTemp;
exports.shouldStartHeating = shouldStartHeating;
exports.testHookResetSkip = function() {
  skippedPreset = undefined;
  nextPreset = undefined;
};


// variables exported as read-write
Object.defineProperty(exports, "overrideSwitch", {
  get: function() {
    return overrideSwitch;
  },
  set: function(value) {
    overrideSwitch = value;
    writeConfig();
  }
});

Object.defineProperty(exports, "skipCurrentSwitch", {
  get: function() {
    return skipCurrentSwitch;
  },
  set: function(value) {
    skipCurrentSwitch = value;
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


// variables exported as read-only
Object.defineProperty(exports, "logger", {
  get: function() {
    return logger;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.logger"!');
  }
});

Object.defineProperty(exports, "root_dir", {
  get: function() {
    return root_dir;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.root_dir"!');
  }
});

Object.defineProperty(exports, "app_dir", {
  get: function() {
    return app_dir;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.app_dir"!');
  }
});

Object.defineProperty(exports, "public_dir", {
  get: function() {
    return public_dir;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.public_dir"!');
  }
});

Object.defineProperty(exports, "img_dir", {
  get: function() {
    return img_dir;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.img_dir"!');
  }
});

Object.defineProperty(exports, "allow_unauthenticated_lan", {
  get: function() {
    return allow_unauthenticated_lan;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.allow_unauthenticated_lan"!');
  }
});

Object.defineProperty(exports, "use_average_temp", {
  get: function() {
    return use_average_temp;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.use_average_temp"!');
  }
});

Object.defineProperty(exports, "rrd_temps_name", {
  get: function() {
    return rrd_temps_name;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.rrd_temps_name"!');
  }
});

Object.defineProperty(exports, "rrd_state_name", {
  get: function() {
    return rrd_state_name;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.rrd_state_name"!');
  }
});

Object.defineProperty(exports, "regulate_interval", {
  get: function() {
    return regulate_interval;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.regulate_interval"!');
  }
});

Object.defineProperty(exports, "scrobble_data_online", {
  get: function() {
    return scrobble_data_online;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.scrobble_data_online"!');
  }
});

Object.defineProperty(exports, "collect_record_interval", {
  get: function() {
    return collect_record_interval;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.collect_record_interval"!');
  }
});

Object.defineProperty(exports, "delay_pump_off", {
  get: function() {
    return delay_pump_off;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.delay_pump_off"!');
  }
});

Object.defineProperty(exports, "env", {
  get: function() {
    return env;
  },
  set: function(value) {
    logger.warn('Attempt to change read-only variable: "config.env"!');
  }
});