var fs = require('fs');
var minify = require('html-minifier').minify;
var escape = require('escape-html');

var auth = require('../authentication.js');

const index_template = minify(fs.readFileSync('pages/templates/index.html', 'utf-8'));

const logged_in_template = minify(fs.readFileSync('pages/templates/index/logged_in.html', 'utf-8'));
const logged_out_template = minify(fs.readFileSync('pages/templates/index/logged_out.html', 'utf-8'));

function strReplace(string, needle, replacement) {
  return string.split(needle).join(replacement||"");
};

exports.processIndex = async function(bot, req, res, args) {
  discordID = await auth.checkAuth(req, res, true); // true means that the user isn't redirected to the login page
  if (discordID) {
    response = strReplace(index_template, "{$MENU_OPTIONS}", 
      strReplace(logged_in_template, "{$USER}", escape(await auth.getUsername(discordID)))
    );
  } else {
    response = strReplace(index_template, "{$MENU_OPTIONS}", logged_out_template);
  }
  res.write(response);
  res.end();
}