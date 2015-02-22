var util = require('util');
var Forecast = require('forecast.io');
var options = {
  APIKey: "<ENTER_KEY_HERE>"
};
var forecast = new Forecast(options);
var config = require('./config-tools');
var logger = config.logger;

var latitude = 45.5539;
var longitude = 18.6657;

var options = {
  exclude: 'minutely,hourly,daily,flags,alerts'
};

var getTemp = function(cb) {
  logger.info('weather-tools.getTemp()');

  forecast.get(latitude, longitude, options, function(err, res, data) {
    if (err) {
      logger.error(err);

      if (typeof(cb) == "function") {
        cb(0, err);
      }
    } else {
      try {
        // logger.debug('  res:', util.inspect(res));
        // logger.debug('  data:', util.inspect(data));

        // var tempF = data.currently.temperature;
        // var roundTempF = tempF.toFixed(1);

        var tempC = ((data.currently.temperature - 32) * 5 / 9);
        var roundTempC = parseFloat(tempC.toFixed(1));

        // logger.debug('  temp (F):', roundTempF, tempF);
        // logger.debug('  temp (C):', roundTempC, tempC);

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