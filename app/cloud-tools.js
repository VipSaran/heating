var request = require('request');
var config = require('./config-tools');
var logger = config.logger;

var sense_url = 'http://api.sen.se/events/?sense_key=<ENTER_KEY_HERE>';

var publishDataOnline = function(last_temp_preset, last_temp_living, last_temp_osijek) {
  if (!config.scrobble_data_online) {
    // logger.debug('cloud_tools.publishDataOnline(), skipped!');
    return;
  }

  logger.info('cloud_tools.publishDataOnline()', last_temp_preset, last_temp_living, last_temp_osijek);

  try {
    // curl -X POST -H "Content-Type: application/json" -d '{ "feed_id": 43290, "value": 8.1 }' http://api.sen.se/events/?sense_key=<ENTER_KEY_HERE>

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
        logger.debug('  body=', body);
      } else {
        logger.error(error);
      }
    });
    request.post({
      url: sense_url,
      json: feed_living
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        logger.debug('  body=', body);
      } else {
        logger.error(error);
      }
    });
    request.post({
      url: sense_url,
      json: feed_osijek
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        logger.debug('  body=', body);
      } else {
        logger.error(error);
      }
    });
  } catch (e) {
    logger.error(e);
  }
}

exports.publishDataOnline = publishDataOnline;