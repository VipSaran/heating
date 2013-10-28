var fs = require('fs');
var config = require('./config-tools');

var cached_users = [];


function User(name, valid) {
  this.name = name;
  this.valid = valid;
}

User.prototype.getName = function() {
  return this.name;
};
User.prototype.isValid = function() {
  return this.valid;
};

function addCachedUser(name, valid) {
  console.log("user-tools.addCachedUser()", name, valid);
  var newUser = {
    name: name,
    valid: valid,
    getName: function() {
      return name;
    },
    isValid: function() {
      return valid;
    },
  };
  cached_users.push(newUser);
  console.log('  cached_users=', cached_users);
}

function getCachedUser(name) {
  console.log("user-tools.getCachedUser()", name);
  for (var i = cached_users.length - 1; i >= 0; i--) {
    if (cached_users[i].getName() === name) {
      return cached_users[i];
    }
  }
  return null;
}

var checkCredentials = function(name, pass, cb) {
  // console.log("user-tools.checkCredentials()", name, pass);

  var cached = getCachedUser(name);
  console.log('  cached=', cached);
  if (cached != null) {
    if (typeof(cb) == "function") {
      cb(cached.isValid());
    }
  } else {
    fs.readFile(config.app_dir + '/.auth', 'utf8', function(err, data_json) {
      if (err) {
        console.error(err);
        if (typeof(cb) == "function") {
          cb(false);
        }
      }

      var valid = false;

      var data = JSON.parse(data_json);
      // console.log('data=', data);
      for (var i = data.length - 1; i >= 0; i--) {
        console.log("  data[" + i + "].username=", data[i].username);
        if (data[i].username === name) {
          // console.log("  data[" + i + "].password=", data[i].password);
          valid = (pass == data[i].password);
          addCachedUser(name, valid);
          break;
        }
      }

      if (typeof(cb) == "function") {
        cb(valid);
      }
    });
  }
}

exports.checkCredentials = checkCredentials;

// checkCredentials("vip_saran", "12pero", function(valid) {
//   console.log("result: " + valid)
// });
// setTimeout(function() {
//   checkCredentials("vip_saran", "12pero", function(valid) {
//     console.log("result: " + valid)
//   });
// }, 2000);
// setTimeout(function() {
//   checkCredentials("test", "pass", function(valid) {
//     console.log("result: " + valid)
//   });
// }, 4000);