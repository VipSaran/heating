var express = require('express');
var request = require('request');
var gpio_tools = require('./gpio-tools');
var weather_tools = require('./weather-tools');
var rrdb_tools = require('./rrdb-tools');

var app = express();

// var inputs = [{
//   pin: '11',
//   gpio: '17',
//   value: 0
// }];

var last_temp_preset = 0;
var last_temp_living = 0;
var last_temp_osijek = 0;


app.configure(function() {
  app.use(express.favicon());
  app.use(express['static'](__dirname + '/../'));

  // gpio_tools.init(inputs[0].pin);

  rrdb_tools.init();

  initTimers();
  rrdb_tools.getLastTemps(function(data) {
    last_temp_preset = data.temp_preset;
    last_temp_living = data.temp_living;
    last_temp_osijek = data.temp_osijek;
  });
});

function isFromLAN(ip) {
  console.log('isFromLAN(' + ip + ')');
  if (ip === '127.0.0.1') {
    return true;
  }

  try {
    var lastDot = ip.lastIndexOf('.');
    var first3Octets = ip.substring(0, lastDot);
    // console.log('first3Octets=' + first3Octets);
    // var lastOctet = ip.substring(lastDot + 1);
    // console.log('lastOctet=' + lastOctet);
    if (first3Octets === '192.168.2') {
      return true;
    }
  } catch (e) {
    console.error('error: ' + e);
    return false;
  }
}

var basicAuth = express.basicAuth;
var auth = function(req, res, next) {

  if (isFromLAN(req.ip)) {
    // console.log('LAN --> no auth needed');
    next();
  } else {
    // console.log(req.ip + ' --> WAN --> auth to pass');
    basicAuth(function(user, pass, callback) {
      callback(null, user === 'test' && pass === 'pass');
    })(req, res, next);
  }
}

app.get('/set_heating/:value', auth, function(req, res) {
  console.log('/set_heating/' + req.params.value);

  res.send(true);

  // set heating (heat+pump) state to value
  // 1: heat(1), pump(1)
  // 0: heat(0), sleep(5min), pump(0)

  // gpio_tools.setValue(req.params.value * 1, function() {
  //   res.send(inputs[0]);
  // });
});

app.get('/get_heating', function(req, res) {
  console.log('/get_heating');

  // get current heating state
  res.send(true);

  // gpio_tools.getValue(function(value) {
  //   inputs[0].value = value;
  //   console.log('inputs[0].value=' + inputs[0].value);
  //   res.send(inputs[0]);
  // });
});

app.get('/set_preset_temp/:value', auth, function(req, res) {
  console.log('/set_preset_temp/' + req.params.value);

  if (req.params.value == 'dec') {
    last_temp_preset--;
  } else {
    last_temp_preset++;
  }

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.send(temps);
});

app.get('/get_temps', function(req, res) {
  console.log('/get_temps');

  var temps = {
    "temp_preset": last_temp_preset,
    "temp_living": last_temp_living,
    "temp_osijek": last_temp_osijek
  };
  res.send(temps);
});

app.get('/refresh_image', function(req, res) {
  console.log('/refresh_image');
  rrdb_tools.paint(function(updated) {
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

  gpio_tools.exitGracefully(function() {
    process.exit(0); // and terminate the program
  });
});

var tempRegulateInterval;
var tempCollectInterval;

function initTimers() {
  console.log('initTimers()');

  tempRegulateInterval = setInterval(function() {
    collectAndRegulateTemp();
  }, 10000); // 10.000 = 10 s

  tempCollectInterval = setInterval(function() {
    collectAndRecordCurrTemps();
  }, 120000); // 120.000 = 2 min
}

function collectAndRegulateTemp() {
  console.log('collectAndRegulateTemp()');

  // gpio_tools.getValue(function(value) {
  last_temp_living = randomFromInterval(20, 26);
  // });
}

function collectAndRecordCurrTemps() {
  console.log('collectAndRecordCurrTemps()');
  var ts = Math.round(new Date().getTime() / 1000);

  weather_tools.getTemp(function(value) {
    last_temp_osijek = value;

    console.log('temp_living=' + last_temp_living);
    console.log('temp_osijek=' + last_temp_osijek);

    rrdb_tools.insert(ts, last_temp_preset, last_temp_living, last_temp_osijek);

    publishDataOnline();
  })
}

function publishDataOnline() {
  // curl -X POST -H "Content-Type: application/json" -d '{ "feed_id": 43290, "value": 8.1 }' http://api.sen.se/events/?sense_key=6AfdW7DuFCNFzoUEXWYWvQ

  var sense_url = 'http://api.sen.se/events/?sense_key=6AfdW7DuFCNFzoUEXWYWvQ';

  var feed_preset = {
    "feed_id": 43288,
    "value": last_temp_preset
  };
  var feed_living = {
    "feed_id": 43289,
    "value": last_temp_living
  };
  var feed_osijek = {
    "feed_id": 43290,
    "value": last_temp_osijek
  };

  request.post({
    url: sense_url,
    json: feed_preset
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error(error);
    }
  });
  request.post({
    url: sense_url,
    json: feed_living
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error(error);
    }
  });
  request.post({
    url: sense_url,
    json: feed_osijek
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body);
    } else {
      console.error(error);
    }
  });
}

function randomFromInterval(from, to) {
  return Math.floor(Math.random() * (to - from + 1) + from);
}