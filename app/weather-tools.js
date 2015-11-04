var util = require('util');
var YQL = require('yql');
var config = require('./config-tools');
var logger = config.logger;

// var city_woeid = 15022267; // Osijek, HR
var city_woeid = 849471; // Esseg, HR
var query = new YQL('select item.condition from weather.forecast where woeid = ' + city_woeid + ' and u="c"');

var getTemp = function(cb) {
  logger.info('weather-tools.getTemp()');

  query.exec(function(err, data) {
    if (err) {
      logger.error(err);

      if (typeof(cb) == "function") {
        cb(0, err);
      }
    } else {
      try {
        // logger.debug('  data:', util.inspect(data));

        var tempC = Number(data.query.results.channel.item.condition.temp);

        var roundTempC = parseFloat(tempC.toFixed(1));

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