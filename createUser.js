var user_tools = require('./app/user-tools');

if (process.argv.length != 4) {
  console.error("Usage:\n\t" + process.argv[0] + " " + process.argv[1] + " <username> <password>");
  process.exit(0);
}

var name = process.argv[2];
var pass = process.argv[3];;

user_tools.createUser(name, pass, function(result) {
  console.log("Created:", result);
});