var fs = require('fs');
var exec = require('child_process').exec;

var app_dir = "/home/pi/nodejs/heating/app";
var rrd_name = "heating.rrd";

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
  var createStr = "rrdtool create " + app_dir + "/" + rrd_name +
    " --start N --step 300 " + // read every 5 min
  "DS:temp_living:GAUGE:600:U:U " +
    "DS:temp_osijek:GAUGE:600:U:U " +
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

var insert = function(ts, temp_living, temp_osijek) {
  console.log("rrdb-tools.insert()");

  var updateStr = "rrdtool update " + app_dir + "/" + rrd_name + " " +
    ts + ":" + temp_living + ":" + temp_osijek;

  execute(updateStr, function(out, err) {
    if (err) throw err;
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


exports.init = init;
exports.insert = insert;
exports.test = test;