var express = require('express');
var favicon = require('serve-favicon');
var http = require('http');
var basicAuth = require('basic-auth');
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


app.use(express.static(config.public_dir));
app.use(favicon(config.img_dir + '/favicon.png'));

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

var auth = function(req, res, next) {
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

    return cb(false);
  }

  isFromLAN(req.ip, function(fromLAN) {
    if (fromLAN) {
      // console.log('LAN --> no auth needed');
      next();
    } else {
      // console.log(req.ip + ' --> WAN --> auth to pass');

      function unauthorized(res) {
        console.log('unauthorized --> 401');
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.sendStatus(401);
      }

      var user = basicAuth(req);

      if (!user || !user.name || !user.pass) {
        console.log('!user');
        return unauthorized(res);
      }

      user_tools.checkCredentials(user.name, user.pass, function(valid) {
        console.log('valid:', valid);
        if (valid) {
          next();
        } else {
          unauthorized(res);
        }
      });
    }
  });
};

function getState() {
  var state = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek,
    "overrideSwitch": config.overrideSwitch,
    "heatingSwitch": config.heatingSwitch,
    "holidaySwitch": config.holidaySwitch,
    "updated": new Date().getTime()
  };

  return state;
}

// routes
app.get('/get_state', function(req, res) {
  console.log('/get_state');

  res.json(getState());
});

app.get('/switch_override/:value', auth, function(req, res) {
  console.log('/switch_override/:', req.params.value);

  config.overrideSwitch = ((req.params.value * 1) == 1);

  if (!config.overrideSwitch) {
    last_temp_preset = config.getTimeTableTemp();
  }

  res.json(getState());
});

app.get('/switch_heating/:value', auth, function(req, res) {
  console.log('/switch_heating/:', req.params.value);

  config.heatingSwitch = ((req.params.value * 1) == 1);

  gpio_tools.switchHeating(config.heatingSwitch);

  res.json(getState());
});

app.get('/switch_holiday/:value', auth, function(req, res) {
  console.log('/switch_holiday/:', req.params.value);

  config.holidaySwitch = ((req.params.value * 1) == 1);

  last_temp_preset = config.getTimeTableTemp();

  res.json(getState());
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

  res.json(getState());

  // regulate_interval = 30s --> regulate now
  collectAndRegulateTemp();
});

app.get('/refresh_image', function(req, res) {
  console.log('/refresh_image');
  rrdb_tools.paintTemps(function(updated) {
    res.send(updated);
  });
});

app.get('/', function(req, res) {
  res.render('index.html');
});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res) {
  res.status(404).send('Unrecognised API call');
});

// Express route to handle errors
app.use(function(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
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