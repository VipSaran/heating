var express = require('express');
var http = require('http');
var config = require('./config-tools');
var user_tools = require('./user-tools');
var gpio_tools = require('./gpio-tools');
var rrdb_tools = require('./rrdb-tools');
var weather_tools = require('./weather-tools');
var cloud_tools = require('./cloud-tools');

var app = express();

console.logCopy = console.log.bind(console);
console.log = function() {
  // var currentTime = '[' + new Date().toISOString().slice(11, -5) + '] ';
  var currentTime = '[' + new Date().toString().split(" ")[4] + '] ';
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'object') {
      arguments[i] = JSON.stringify(arguments[i], null, 2);
    }
  }
  this.logCopy(currentTime.concat(Array.prototype.slice.call(arguments)));
};
console.errorCopy = console.error.bind(console);
console.error = function() {
  // var currentTime = '[' + new Date().toISOString().slice(11, -5) + '] ';
  var currentTime = '[' + new Date().toString().split(" ")[4] + '] ';
  for (var i = 0; i < arguments.length; i++) {
    if (typeof arguments[i] === 'object') {
      arguments[i] = JSON.stringify(arguments[i], null, 2);
    }
  }
  this.errorCopy(currentTime.concat(Array.prototype.slice.call(arguments)));
};

var last_temp_preset = 0;
var last_temp_living = 0;
var last_temp_osijek = 0;


app.configure(function() {
  app.use(express.favicon());
  app.use(express['static'](__dirname + '/../'));

  config.init(function() {

    gpio_tools.init();

    rrdb_tools.init();

    initTimers();
    rrdb_tools.getLastTemps(function(data) {
      if (config.holidaySwitch) {
        last_temp_preset = config.getTimeTableTemp();
      } else {
        last_temp_preset = data.temp_preset;
      }
      last_temp_living = data.temp_living;
      last_temp_osijek = data.temp_osijek;
    });
  });
});

function isFromLAN(ip, cb) {
  console.log('isFromLAN()', ip);
  if (ip === '127.0.0.1') {
    return cb(true);
  }

  try {
    var lastDot = ip.lastIndexOf('.');
    var first3Octets = ip.substring(0, lastDot);
    // console.log('first3Octets=', first3Octets);
    // var lastOctet = ip.substring(lastDot + 1);
    // console.log('lastOctet=', lastOctet);
    if (first3Octets === '192.168.2') {
      return cb(true);
    }
  } catch (e) {
    console.error('error: ' + e);
  }

  // allow access from external IP if it is the same as servers
  // e.g. access via DynDNS is external, but if client and server IP are the same
  // --> they share a WAN address --> they come from same LAN
  http.get('http://curlmyip.com/', function(res) {
    var extIP = '';
    res.on('data', function(chunk) {
      console.log('http.get, body: ' + chunk);
      extIP += chunk;
    });
    res.on('end', function() {
      extIP = extIP.trim();
      console.log('http.get, ip (' + ip + ') === extIP (' + extIP + ') -->', ip === extIP);
      return cb(ip === extIP);
    });
  }).on('error', function(e) {
    console.log("http.get, error: " + e.message);
    return cb(false);
  });
}

var basicAuth = express.basicAuth;
var auth = function(req, res, next) {

  isFromLAN(req.ip, function(fromLAN) {
    if (fromLAN) {
      // console.log('LAN --> no auth needed');
      next();
    } else {
      // console.log(req.ip + ' --> WAN --> auth to pass');
      basicAuth(function(user, pass, callback) {
        user_tools.checkCredentials(user, pass, function(valid) {
          callback(null, valid);
        });
      })(req, res, next);
    }
  });
}

// routes
app.get('/get_switches', function(req, res) {
  console.log('/get_switches');

  var states = {
    "overrideSwitch": config.overrideSwitch,
    "heatingSwitch": config.heatingSwitch,
    "holidaySwitch": config.holidaySwitch
  };
  res.json(states);
});

app.get('/switch_override/:value', auth, function(req, res) {
  console.log('/switch_override/:', req.params.value);

  config.overrideSwitch = ((req.params.value * 1) == 1);

  if (!config.overrideSwitch) {
    last_temp_preset = config.getTimeTableTemp();
  }

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.json(temps);
});

app.get('/switch_heating/:value', auth, function(req, res) {
  console.log('/switch_heating/:', req.params.value);

  config.heatingSwitch = ((req.params.value * 1) == 1);

  gpio_tools.switchHeating(config.heatingSwitch);

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.json(temps);
});

app.get('/switch_holiday/:value', auth, function(req, res) {
  console.log('/switch_holiday/:', req.params.value);

  config.holidaySwitch = ((req.params.value * 1) == 1);

  last_temp_preset = config.getTimeTableTemp();

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.json(temps);
});

app.get('/set_preset_temp/:value', auth, function(req, res) {
  console.log('/set_preset_temp/:', req.params.value);

  config.overrideSwitch = true;

  if (isNaN(req.params.value)) {
    if (req.params.value == 'dec') {
      last_temp_preset--;
    } else {
      last_temp_preset++;
    }
  } else {
    last_temp_preset = req.params.value;
  }

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.json(temps);

  // regulate_interval = 30s --> regulate now
  collectAndRegulateTemp();
});

app.get('/get_temps', function(req, res) {
  console.log('/get_temps');

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.json(temps);
});

app.get('/refresh_image', function(req, res) {
  console.log('/refresh_image');
  rrdb_tools.paintTemps(function(updated) {
    res.send(updated);
  });
});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  res.send('Unrecognised API call', 404);
});

// Express route to handle errors
app.use(function(err, req, res, next) {
  if (req.xhr) {
    res.send(500, 'Oops, Something went wrong!');
  } else {
    next(err);
  }
});

app.listen(3000);
console.log('App Server running at port 3000');

process.on('SIGINT', function() {
  console.log('About to exit.');

  clearInterval(tempRegulateInterval);
  clearInterval(tempCollectInterval);

  config.writeConfig(function() {
    gpio_tools.exitGracefully(function() {
      process.exit(0); // and terminate the program
    });
  });
});

var tempRegulateInterval;
var tempCollectInterval;

function initTimers() {
  console.log('initTimers()');

  tempRegulateInterval = setInterval(function() {
    collectAndRegulateTemp();
  }, config.regulate_interval);

  tempCollectInterval = setInterval(function() {
    collectAndRecordCurrTemps();
  }, config.collect_record_interval);
}

function collectAndRegulateTemp() {
  console.log('collectAndRegulateTemp()');
  var ts = Math.round(new Date().getTime() / 1000);

  gpio_tools.getTempLiving(last_temp_living, function(value) {
    last_temp_living = value;

    if (!config.overrideSwitch) {
      last_temp_preset = config.getTimeTableTemp();
    }

    // regulate on/off
    gpio_tools.regulateHeating(
      config.shouldStartHeating(undefined, last_temp_preset, last_temp_living, last_temp_osijek)
    );
  });

  gpio_tools.getHeaterState(function(state) {
    rrdb_tools.insertState(ts, state ? 1 : 0);
  });
}

function collectAndRecordCurrTemps() {
  console.log('collectAndRecordCurrTemps()');
  var ts = Math.round(new Date().getTime() / 1000);

  weather_tools.getTemp(function(value, error) {
    if (!error) {
      last_temp_osijek = value;
    }

    console.log('  temp_living=', last_temp_living);
    console.log('  temp_osijek=', last_temp_osijek);

    rrdb_tools.insertTemps(ts, last_temp_preset, last_temp_living, last_temp_osijek);

    // cloud_tools.publishDataOnline(last_temp_preset, last_temp_living, last_temp_osijek);
  })
}

function randomFromInterval(from, to) {
  return Math.floor(Math.random() * (to - from + 1) + from);
}