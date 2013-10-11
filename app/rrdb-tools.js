var fs = require('fs');
var exec = require('child_process').exec;

var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";
var rrd_name = "heating.rrd";
var img_dir = project_dir + "/assets-local/img";
var img_name = "temperatures_graph.png";
var img_name_week = "temperatures_graph_week.png";
var img_name_month = "temperatures_graph_month.png";

function execute(command, callback) {
  exec(command, function(error, stdout, stderr) {
    console.log("command: " + command);
    console.log("error: " + error);
    console.log("stdout: " + stdout);
    console.log("stderr: " + stderr);
    callback(stdout, stderr);
  });
};

function createRRD() {
  var createStr = "rrdtool create " + app_dir + "/" + rrd_name + " " + //
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

var init = function() {
  console.log("rrdb-tools.init()");

  if (!fs.existsSync(app_dir + "/" + rrd_name)) {
    createRRD();
  } else {
    // exists --> check if valid
    execute("rrdtool info " + app_dir + "/" + rrd_name, function(out, err) {
      if (err) {
        execute("rm " + app_dir + "/" + rrd_name, function(out, err) {
          createRRD();
        });
      }
    });
  }
};

// Should be called only at application start.
// Later, live values are taken directly from the app context.
var getLastTemps = function(cb) {
  console.log("rrdb-tools.getLastTemps()");

  var lastUpdateStr = "rrdtool lastupdate " + app_dir + "/" + rrd_name;

  execute(lastUpdateStr, function(out, err) {
    if (err) {
      if (typeof(cb) == "function") {
        cb(defaultTempPreset);
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
      console.log("  tabs: " + tabs);

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
      console.log("  Parsing error: " + err);
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

var insert = function(ts, temp_preset, temp_living, temp_osijek) {
  console.log("rrdb-tools.insert()");

  var updateStr = "rrdtool update " + app_dir + "/" + rrd_name + " " +
    ts + ":" + temp_preset + ":" + temp_living + ":" + temp_osijek;

  execute(updateStr, function(out, err) {
    if (err) throw err;
  });
};

function getCurrTimeSec() {
  var now = new Date().getTime();
  return (parseFloat(now / 1000).toFixed(0));
}

function getWeekOldTimeSec() {
  return (getCurrTimeSec() - (3600 * 24 * 7));
}

function getMonthOldTimeSec() {
  return (getCurrTimeSec() - (3600 * 24 * 30));
}

var lastPaintedMillis = 0;

var paint = function(cb) {
  console.log("rrdb-tools.paint()");

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
    'DEF:mytemp_preset=' + app_dir + "/" + rrd_name + ':temp_preset:AVERAGE ' +
    'DEF:mytemp_living=' + app_dir + "/" + rrd_name + ':temp_living:AVERAGE ' +
    'DEF:mytemp_osijek=' + app_dir + "/" + rrd_name + ':temp_osijek:AVERAGE ' +
    'LINE:mytemp_osijek#1F77B4:"Osijek" ' +
    'LINE:mytemp_preset#2CA02C:"zadano" ' +
    'LINE:mytemp_living#D62728:"dnevna soba"';

  // uses "RRA:AVERAGE:0.5:1:288 " + // 5 min avg., last 24 hours
  var graphStrDay = 'rrdtool graph ' + img_dir + '/' + img_name + ' ' +
    '--end N ' +
    '--x-grid HOUR:1:HOUR:8:HOUR:2:0:%Hh '; // grid_lines:major_grid_lines:labels:labels_shift

  // uses "RRA:AVERAGE:0.5:12:168 " + // 1 hour avg., last 7 days
  var graphStrWeek = 'rrdtool graph ' + img_dir + '/' + img_name_week + ' ' +
    '--start ' + getWeekOldTimeSec() + ' --end N ' +
    '--x-grid HOUR:8:DAY:1:DAY:1:259200:%a ';

  // uses "RRA:AVERAGE:0.5:48:315 " + // 4 hour avg., last 30 days
  var graphStrMonth = 'rrdtool graph ' + img_dir + '/' + img_name_month + ' ' +
    '--start ' + getMonthOldTimeSec() + ' --end N ' +
    '--x-grid DAY:1:DAY:7:DAY:7:0:%d.%m. ';


  execute(graphStrDay + graphStrDefaults, function(out, err) {
    if (err) throw err;

    console.log("  painted DAY");

    // only update if actually painted
    lastPaintedMillis = currTimeMillis;

    execute(graphStrWeek + graphStrDefaults, function(out, err) {
      if (err) throw err;

      console.log("  painted WEEK");

      execute(graphStrMonth + graphStrDefaults, function(out, err) {
        if (err) throw err;

        console.log("  painted MONTH");

        if (typeof(cb) == "function") {
          cb(true); // updated
        }
      });
    });
  });
};

exports.init = init;
exports.getLastTemps = getLastTemps;
exports.insert = insert;
exports.paint = paint;