var fs = require('fs');
var bcrypt = require('bcrypt-nodejs');
var basicAuth = require('basic-auth');
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
          valid = bcrypt.compareSync(pass, data[i].password);
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

var createUser = function(name, pass, cb) {
  // console.log("user-tools.createUser()", name, pass);

  bcrypt.hash(pass, null, null, function(err, hash) {
    fs.readFile(config.app_dir + '/.auth', 'utf8', function(err, data_json) {
      var users;
      if (err) {
        console.error(err);
        users = [];
      } else {
        try {
          users = JSON.parse(data_json);
          if (users.constructor !== Array) {
            throw new TypeError("'.auth' JSON must be an array.");
          }
        } catch (ex) {
          console.error(ex);
          // invalid JSON --> reset it
          users = [];
        }
      }
      // console.log('users=', users);

      var newUser = {
        "username": name,
        "password": hash
      };

      var existing = false;
      for (var i = users.length - 1; i >= 0; i--) {
        console.log("  users[" + i + "].username=", users[i].username);
        if (users[i].username === newUser.username) {
          existing = true;
          users[i] = newUser;
          break;
        }
      }

      if (!existing) {
        // existing user not updated -- add new one
        users.push(newUser);
      }

      fs.writeFile(config.app_dir + '/.auth', JSON.stringify(users), function(err) {
        if (err) {
          console.error(err);
          if (typeof(cb) == "function") {
            cb(false);
          }
        } else {
          console.log("  user '" + newUser.username + "' successfully " + existing ? "updated" : "created");

          // reset cached users
          cached_users = [];

          if (typeof(cb) == "function") {
            cb(true);
          }
        }
      });
    });
  });
}

/**
 * Simple basic auth middleware for use with Express 4.x.
 *
 * @example
 * app.use('/api-requiring-auth', utils.basicAuth('username', 'password'));
 *
 * @param   {string}   username Expected username
 * @param   {string}   password Expected password
 * @returns {function} Express 4 middleware requiring the given credentials
 */
exports.basicAuth = function(username, password) {
  return function(req, res, next) {
    var user = basicAuth(req);

    checkCredentials(user, pass, function(valid) {
      if (!valid) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.send(401);
      }

      next();
    });
  };
};

exports.checkCredentials = checkCredentials;
exports.createUser = createUser;