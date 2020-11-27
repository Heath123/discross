var url = require('url');
var fs = require('fs');
var minify = require('html-minifier').minify;
var escape = require('escape-html');

var auth = require('../authentication.js');

const register_template = minify(fs.readFileSync('pages/templates/register.html', 'utf-8'));
const error_template = minify(fs.readFileSync('pages/templates/login/error.html', 'utf-8'));

function strReplace(string, needle, replacement) {
  return string.split(needle).join(replacement||"");
};

exports.processRegister = async function(bot, req, res, args) {
  discordID = await auth.checkAuth(req, res, true); // true means that the user isn't redirected to the login page
  if (discordID) {
    res.writeHead(302, {"Location": "/server/"});
    res.write('Logged in! Click <a href="/server/">here</a> to continue.');
  } else {
    parsedurl = url.parse(req.url, true);
    response = register_template;
    if (parsedurl.query.errortext) {
      response = strReplace(response, "{$ERROR}", strReplace(error_template, "{$ERROR_MESSAGE}", strReplace(escape(parsedurl.query.errortext), "\n", "<br>")));
    } else {
      response = strReplace(response, "{$ERROR}", "");
    }
    res.write(response);
  }
  res.end();
}