var util = require('util');
var Forecast = require('forecast.io');
var options = {
  APIKey: "<ENTER_KEY_HERE>"
};
var forecast = new Forecast(options);

var latitude = 45.5539;
var longitude = 18.6657;

var options = {
  exclude: 'minutely,hourly,daily,flags,alerts'
};

var getTemp = function(cb) {
  console.log('weather-tools.getTemp()');

  forecast.get(latitude, longitude, options, function(err, res, data) {
    if (err) {
      console.error(err);

      if (typeof(cb) == "function") {
        cb(0, err);
      }
    } else {
      try {
        // console.log('  res:', util.inspect(res));
        // console.log('  data:', util.inspect(data));

        // var tempF = data.currently.temperature;
        // var roundTempF = tempF.toFixed(1);

        var tempC = ((data.currently.temperature - 32) * 5 / 9);
        var roundTempC = tempC.toFixed(1);

        // console.log('  temp (F):', roundTempF, tempF);
        // console.log('  temp (C):', roundTempC, tempC);

        if (typeof(cb) == "function") {
          cb(roundTempC);
        }
      } catch (exception) {
        if (typeof(cb) == "function") {
          cb(0, exception);
        }
      }
    }
  });
}

exports.getTemp = getTemp;