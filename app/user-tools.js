var fs = require('fs');

var project_dir = "/home/pi/nodejs/heating";
var app_dir = project_dir + "/app";

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
  console.log("user-tools.addCachedUser(" + name + ", " + valid + ")");
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
  console.log(cached_users);
}

function getCachedUser(name) {
  console.log("user-tools.getCachedUser(" + name + ")");
  for (var i = cached_users.length - 1; i >= 0; i--) {
    if (cached_users[i].getName() === name) {
      return cached_users[i];
    }
  }
  return null;
}

var checkCredentials = function(user, pass, cb) {
  console.log("user-tools.checkCredentials(" + user + ", " + pass + ")");

  var cached = getCachedUser(user);
  console.log(cached);
  if (cached != null) {
    if (typeof(cb) == "function") {
      cb(cached.isValid());
    }
  } else {
    fs.readFile(app_dir + '/.auth', 'utf8', function(err, data_json) {
      if (err) {
        console.error(err);
        if (typeof(cb) == "function") {
          cb(false);
        }
      }

      var data = JSON.parse(data_json);
      console.log(data);
      console.log("data.username=" + data.username);
      console.log("data.password=" + data.password);

      var valid = (user == data.username && pass == data.password);

      addCachedUser(user, valid);

      if (typeof(cb) == "function") {
        cb(valid);
      }
    });
  }
}

exports.checkCredentials = checkCredentials;