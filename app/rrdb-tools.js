var fs = require('fs');
var exec = require('child_process').exec;
var config = require('./config-tools');

var img_name = "temperatures_graph.png";
var img_name_hour = "temperatures_graph_hour.png";
var img_name_week = "temperatures_graph_week.png";
var img_name_month = "temperatures_graph_month.png";

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    console.log("  command: ", command);
    console.log("  error: ", error);
    console.log("  stdout: ", stdout);
    console.log("  stderr: ", stderr);
    callback(stdout, stderr);
  });
}

function createRRD_temps() {
  console.log("rrdb-tools.createRRD_temps()");

  var createStr = "rrdtool create " + config.app_dir + "/" + config.rrd_temps_name + " " + //
  "--start N --step 300 " + // data bucket 5 min long
  "DS:temp_preset:GAUGE:600:-30:40 " + // human defined
  "DS:temp_living:GAUGE:600:-30:40 " + // measured in livingroom
  "DS:temp_osijek:GAUGE:600:-30:40 " + // online value
  "RRA:AVERAGE:0.5:1:288 " + // 5 min avg., last 24 hours
  "RRA:AVERAGE:0.5:12:168 " + // 1 hour avg., last 7 days
  "RRA:AVERAGE:0.5:48:315 " + // 4 hour avg., last 30 days
  "RRA:AVERAGE:0.5:288:365" // 1 day avg., last 365 days

  execute(createStr, function(out, err) {
    if (err) throw err;
  });
}

function createRRD_state() {
  console.log("rrdb-tools.createRRD_state()");

  var createStr = "rrdtool create " + config.app_dir + "/" + config.rrd_state_name + " " + //
  "--start N --step 30 " + // data bucket 30 s long
  "DS:heater_state:GAUGE:60:0:1 " + // heater state (0/1)
  "RRA:AVERAGE:0.5:1:2880" // last value in 30 s, for last 1 hour

  execute(createStr, function(out, err) {
    if (err) throw err;
  });
}

var init = function() {
  console.log("rrdb-tools.init()");

  if (!fs.existsSync(config.app_dir + "/" + config.rrd_temps_name)) {
    createRRD_temps();
  } else {
    // exists --> check if valid
    execute("rrdtool info " + config.app_dir + "/" + config.rrd_temps_name, function(out, err) {
      if (err) {
        execute("rm " + config.app_dir + "/" + config.rrd_temps_name, function(out, err) {
          createRRD_temps();
        });
      }
    });
  }

  if (!fs.existsSync(config.app_dir + "/" + config.rrd_state_name)) {
    createRRD_state();
  } else {
    // exists --> check if valid
    execute("rrdtool info " + config.app_dir + "/" + config.rrd_state_name, function(out, err) {
      if (err) {
        execute("rm " + config.app_dir + "/" + config.rrd_state_name, function(out, err) {
          createRRD_state();
        });
      }
    });
  }
};

// Should be called only at application start.
// Later, live values are taken directly from the app context.
var getLastTemps = function(cb) {
  console.log("rrdb-tools.getLastTemps()");

  var lastUpdateStr = "rrdtool lastupdate " + config.app_dir + "/" + config.rrd_temps_name;

  execute(lastUpdateStr, function(out, err) {
    if (err) {
      if (typeof(cb) == "function") {
        cb({
          "temp_preset": 22,
          "temp_living": 22,
          "temp_osijek": 10
        });
      }
    }

    //  temp_preset temp_living temp_osijek
    //
    //1380478323: 24 24 10.2
    //

    var temps;
    try {
      var lines = out.replace(/\r\n/g, "\n").split("\n");

      var tabs = lines[2].split(" ");
      // console.log("  tabs:", tabs);

      temps = {
        "temp_preset": tabs[1],
        "temp_living": tabs[2],
        "temp_osijek": tabs[3]
      };

      if (typeof(cb) == "function") {
        if (temps == undefined || temps == "undefined") {
          temps = {
            "temp_preset": 23,
            "temp_living": 0,
            "temp_osijek": 0
          };
        }
        cb(temps);
      }

    } catch (err) {
      console.error("  Parsing error: ", err);
      if (typeof(cb) == "function") {
        temps = {
          "temp_preset": 23,
          "temp_living": 0,
          "temp_osijek": 0
        };
        cb(temps);
      }
    }
  });
};

var insertTemps = function(ts, temp_preset, temp_living, temp_osijek) {
  console.log("rrdb-tools.insertTemps()");

  var updateStr = "rrdtool update " + config.app_dir + "/" + config.rrd_temps_name + " " +
    ts + ":" + temp_preset + ":" + temp_living + ":" + temp_osijek;

  execute(updateStr, function(out, err) {
    if (err)
      console.error("  " + config.rrd_temps_name + " update error:", err);
  });
};

var insertState = function(ts, heater_state) {
  console.log("rrdb-tools.insertState()");

  var updateStr = "rrdtool update " + config.app_dir + "/" + config.rrd_state_name + " " +
    ts + ":" + heater_state;

  execute(updateStr, function(out, err) {
    if (err)
      console.error("  " + config.rrd_state_name + " update error:", err);
  });
};

var lastPaintedMillis = 0;

var paintTemps = function(cb) {
  console.log("rrdb-tools.paintTemps()");

  var currTimeMillis = new Date().getTime();
  if (currTimeMillis < (lastPaintedMillis + 300000)) {
    if (typeof(cb) == "function") {
      cb(false); // not updated
    }

    return;
  }

  var graphStrDefaults = '--font DEFAULT:0:"Droid Sans" ' +
    '--vertical-label "°C" --border 0 --zoom 2 --slope-mode ' +
    '--color CANVAS#FFFFFF00 --color FRAME#000000FF --color BACK#FFFFFF00 ' +
    'TEXTALIGN:center ' +
    'DEF:mytemp_preset=' + config.app_dir + "/" + config.rrd_temps_name + ':temp_preset:AVERAGE ' +
    'DEF:mytemp_living=' + config.app_dir + "/" + config.rrd_temps_name + ':temp_living:AVERAGE ' +
    'DEF:mytemp_osijek=' + config.app_dir + "/" + config.rrd_temps_name + ':temp_osijek:AVERAGE ' +
    'LINE:mytemp_osijek#1F77B4:"Osijek" ' +
    'LINE:mytemp_preset#2CA02C:"zadano" ' +
    'LINE:mytemp_living#D62728:"dnevna soba"';

  // uses "RRA:AVERAGE:0.5:1:288 " + // 5 min avg., last 24 hours
  var graphStrDay = 'rrdtool graph ' + config.img_dir + '/' + img_name + ' ' +
    '--start -86400 --end N ' +
    '--x-grid HOUR:1:HOUR:8:HOUR:2:0:%Hh '; // grid_lines:major_grid_lines:labels:labels_shift

  // uses "RRA:AVERAGE:0.5:12:168 " + // 1 hour avg., last 7 days
  var graphStrWeek = 'rrdtool graph ' + config.img_dir + '/' + img_name_week + ' ' +
    '--start -604800 --end N ' +
    '--x-grid HOUR:8:DAY:1:DAY:1:259200:%a ';

  // uses "RRA:AVERAGE:0.5:48:315 " + // 4 hour avg., last 30 days
  var graphStrMonth = 'rrdtool graph ' + config.img_dir + '/' + img_name_month + ' ' +
    '--start -2592000 --end N ' +
    '--x-grid DAY:1:DAY:7:DAY:7:0:%d.%m. ';


  execute(graphStrDay + graphStrDefaults, function(out, err) {
    if (err) {
      console.error(err);
    } else {
      console.log("  painted DAY");
    }

    // only update if actually painted
    lastPaintedMillis = currTimeMillis;

    execute(graphStrWeek + graphStrDefaults, function(out, err) {
      if (err) {
        console.error(err);
      } else {
        console.log("  painted WEEK");
      }

      execute(graphStrMonth + graphStrDefaults, function(out, err) {
        if (err) {
          console.error(err);
        } else {
          console.log("  painted MONTH");
        }

        paintTempsAndState(function() {
          if (typeof(cb) == "function") {
            cb(!err); // updated
          }
        });
      });
    });
  });
};

var paintTempsAndState = function(cb) {
  console.log("rrdb-tools.paintTempsAndState()");

  var graphStrHour = 'rrdtool graph ' + config.img_dir + '/' + img_name_hour + ' ' +
    '--start -3600 --end N ' +
    '--x-grid MINUTE:1:MINUTE:5:MINUTE:10:0:%H:%M '; // grid_lines:major_grid_lines:labels:labels_shift

  var graphStrDefaults = '--font DEFAULT:0:"Droid Sans" ' +
    '--vertical-label "°C" --border 0 --zoom 2 --slope-mode ' +
    '--lower-limit 17 --upper-limit 23 --rigid ' +
    '--color CANVAS#FFFFFF00 --color FRAME#000000FF --color BACK#FFFFFF00 ' +
    'TEXTALIGN:center ' +
    'DEF:mytemp_preset=' + config.app_dir + "/" + config.rrd_temps_name + ':temp_preset:AVERAGE ' +
    'DEF:mytemp_living=' + config.app_dir + "/" + config.rrd_temps_name + ':temp_living:AVERAGE ' +
    'DEF:myheater_state=' + config.app_dir + "/" + config.rrd_state_name + ':heater_state:AVERAGE ' +
    'CDEF:myheater_state_rel=myheater_state,0.5,GT,mytemp_preset,0,IF ' +
    'AREA:myheater_state_rel#FE7F0E:"grijac" ' +
    'LINE:mytemp_preset#2CA02C:"zadano" ' +
    'LINE:mytemp_living#D62728:"dnevna soba"';

  execute(graphStrHour + graphStrDefaults, function(out, err) {
    if (err) {
      console.error(err);
    } else {
      console.log("  painted HOUR");
    }

    if (typeof(cb) == "function") {
      cb(!err); // updated
    }
  });
};

exports.init = init;
exports.getLastTemps = getLastTemps;
exports.insertTemps = insertTemps;
exports.insertState = insertState;
exports.paintTemps = paintTemps;