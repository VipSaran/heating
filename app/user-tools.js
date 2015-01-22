var fs = require('fs');
var bcrypt = require('bcrypt-nodejs');
var config = require('./config-tools');

var cached_users = [];

var verifyPassword = function(users, name, pass, cb) {
  var valid = false;

  for (var i = users.length - 1; i >= 0; i--) {
    console.log("user-tools.verifyPassword(), users[" + i + "].username=", users[i].username);
    if (users[i].username === name) {
      console.log('bcrypt.compareSync() start');
      valid = bcrypt.compareSync(pass, users[i].password);
      console.log('bcrypt.compareSync() end');

      // can only be one user with same username in the array
      break;
    }
  }

  if (typeof(cb) == "function") {
    cb(valid);
  }
};

var checkCredentials = function(name, pass, cb) {
  // console.log("user-tools.checkCredentials()", name, pass);

  if (cached_users.length > 0) {
    console.log("user-tools.checkCredentials(), cached");
    verifyPassword(cached_users, name, pass, cb);
  } else {
    readAuth(function(users) {
      verifyPassword(users, name, pass, cb);
    });
  }
};

var readAuth = function(cb) {
  console.log("user-tools.readAuth()");

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

    cb(users);
  });
}

var createUser = function(name, pass, cb) {
  // console.log("user-tools.createUser()", name, pass);

  bcrypt.hash(pass, null, null, function(err, hash) {
    readAuth(function(users) {
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
          cached_users = users;

          if (typeof(cb) == "function") {
            cb(true);
          }
        }
      });
    });
  });
}

exports.checkCredentials = checkCredentials;
exports.createUser = createUser;