var util = require('util');
var Forecast = require('forecast.io');
var options = {
  APIKey: "73a9873cb08775d7b04b24dbd749ae93"
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
    if (err) throw err;
    // console.log('res: ' + util.inspect(res));
    // console.log('data: ' + util.inspect(data));

    // var tempF = data.currently.temperature;
    // var roundTempF = tempF.toFixed(1);

    var tempC = ((data.currently.temperature - 32) * 5 / 9);
    var roundTempC = tempC.toFixed(1);

    // console.log('temp (F): ' + roundTempF + ' (' + tempF + ')');
    // console.log('temp (C): ' + roundTempC + ' (' + tempC + ')');

    if (typeof(cb) == "function") {
      cb(roundTempC);
    }
  });
}

exports.getTemp = getTemp;