var fs = require('fs');
var exec = require('child_process').exec;

var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";
var rrd_name = "heating.rrd";
var img_dir = project_dir + "/assets-local/img";
var img_name = "temperatures_graph.png";

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
}

var defaultTempPreset = 23;
var getLastTempPreset = function(cb) {
  console.log("rrdb-tools.getLastTempPreset()");

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

    try {
      var lines = out.replace(/\r\n/g, "\n").split("\n");
      var tabs = lines[2].split(" ");
      var temp = tabs[1];
      console.log("parsing result: " + temp);
      if (typeof(cb) == "function") {
        if (temp == undefined || temp == "undefined") {
          temp = defaultTempPreset;
        }
        cb(temp);
      }

    } catch (err) {
      console.log("Parsing error: " + err);
      if (typeof(cb) == "function") {
        cb(defaultTempPreset);
      }
    }
  });
}

var insert = function(ts, temp_preset, temp_living, temp_osijek) {
  console.log("rrdb-tools.insert()");

  var updateStr = "rrdtool update " + app_dir + "/" + rrd_name + " " +
    ts + ":" + temp_preset + ":" + temp_living + ":" + temp_osijek;

  execute(updateStr, function(out, err) {
    if (err) throw err;
  });
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

  var graphStr = 'rrdtool graph ' + img_dir + '/' + img_name + ' ' +
    '--end N --x-grid HOUR:1:HOUR:8:HOUR:2:0:%H ' +
    '--vertical-label "C" --border 0 --zoom 2 --slope-mode ' +
    '--color CANVAS#FFFFFF00 --color FRAME#000000FF --color BACK#FFFFFF00 ' +
    'TEXTALIGN:center ' +
    'DEF:mytemp_preset=' + app_dir + "/" + rrd_name + ':temp_preset:AVERAGE ' +
    'DEF:mytemp_living=' + app_dir + "/" + rrd_name + ':temp_living:AVERAGE ' +
    'DEF:mytemp_osijek=' + app_dir + "/" + rrd_name + ':temp_osijek:AVERAGE ' +
    'LINE:mytemp_preset#2CA02C:"zadano" ' +
    'LINE:mytemp_living#D62728:"dnevna soba" ' +
    'LINE:mytemp_osijek#1F77B4:"Osijek"';

  execute(graphStr, function(out, err) {
    if (err) throw err;

    // only update if actually painted
    lastPaintedMillis = currTimeMillis;

    if (typeof(cb) == "function") {
      cb(true); // updated
    }
  });
}

var test = function(cb) {
  console.log("rrdb-tools.test()");
  execute("pwd", function(dir) {
    console.log(dir);
    if (typeof(cb) == "function") {
      cb(dir);
    }
  });
}

var getImageName = function() {
  return img_name;
}


exports.init = init;
exports.getLastTempPreset = getLastTempPreset;
exports.insert = insert;
exports.paint = paint;
exports.getImageName = getImageName;
exports.test = test;