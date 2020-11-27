var url = require('url');
var fs = require('fs');
var minify = require('html-minifier').minify;
var escape = require('escape-html');

var auth = require('../authentication.js');

const forgot_template = minify(fs.readFileSync('pages/templates/forgot.html', 'utf-8'));
const error_template = minify(fs.readFileSync('pages/templates/login/error.html', 'utf-8'));

function strReplace(string, needle, replacement) {
  return string.split(needle).join(replacement||"");
};

exports.processForgot = async function(bot, req, res, args) {
  parsedurl = url.parse(req.url, true);
  response = forgot_template;
  if (parsedurl.query.errortext) {
    response = strReplace(response, "{$ERROR}", strReplace(error_template, "{$ERROR_MESSAGE}", strReplace(escape(parsedurl.query.errortext), "\n", "<br>")));
  } else {
    response = strReplace(response, "{$ERROR}", "");
  }
  res.write(response);
  res.end();
}