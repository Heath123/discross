const url = require('url');
const auth = require('../authentication.js');
const bot = require('../bot.js');
const discord = require('discord.js');

function strReplace(string, needle, replacement) {
  return string.split(needle).join(replacement||"");
};

// https://stackoverflow.com/questions/1967119/why-does-javascript-replace-only-first-instance-when-using-replace

async function clean(server, nodelete) {
  (await server.fetchWebhooks()).forEach(async function(item) {
    if ((item.owner.username.search("Discross") != -1) && (item.id != nodelete)) {
      try {
        await item.delete();
      } catch(err) {}
    }
  });
}

exports.sendMessage = async function sendMessage(bot, req, res, args, discordID) {
  parsedurl = url.parse(req.url, true);
  if (parsedurl.query.message != "") {

    channel = await bot.client.channels.fetch(parsedurl.query.channel);

    member = await channel.guild.members.fetch(discordID);
    user = member.user;
    username = user.tag;
    if (member.displayName != user.username) {
      username = member.displayName + " (@" + user.tag + ")";
    }

    // if (user.permissionsIn(channel).FLAGS)]
    if (!member.permissionsIn(channel).has("SEND_MESSAGES", true)) { // True always allows admins to send messages
      res.write("You don't have permission to do that!");
      res.end();
      return;
    }

    // webhooks (serverID INT, webhookID INT, url STRING)
    webhookDB = await auth.dbQuerySingle("SELECT * FROM webhooks WHERE serverID=?", [channel.guild.id]);

    if (!webhookDB) {
      webhook = await channel.createWebhook("Discross", "pages/static/resources/logo.png", "Discross uses webhooks to send messages");
      auth.dbQuerySingle("INSERT INTO webhooks VALUES (?,?,?)", [channel.guild.id, webhook.id, webhook.token]);
      clean(channel.guild, webhook.id); // Clean up all webhooks except the new one
    } else {
      // webhook = new Discord.WebhookClient(webhookDB.webhookID, webhookDB.token);
      try {
        webhook = await bot.client.fetchWebhook(webhookDB.webhookID); 
      } catch (err) {
        webhook = await channel.createWebhook("Discross", "pages/static/resources/logo.png", "Discross uses webhooks to send messages");
        auth.dbQuerySingle("INSERT INTO webhooks VALUES (?,?,?)", [channel.guild.id, webhook.id, webhook.token]);
        clean(channel.guild, webhook.id); // Clean up all webhooks except the new one
      }
      clean(channel.guild, webhookDB.webhookID);
    }

    processedmessage = parsedurl.query.message;

    // https://stackoverflow.com/questions/6323417/regex-to-extract-all-matches-from-string-using-regexp-exec
    // regex modified from https://www.reddit.com/r/discordapp/comments/6k4fml/username_requirements/

    var regex = /@([^#]{2,32}#\d{4})/g; // Regular expression to detect user mentions
    var m;

    do {
      m = regex.exec(processedmessage);
      if (m) {
        mentioneduser = await channel.guild.members.cache.find(member => member.user.tag == m[1]);
        if (!mentioneduser) {
          mentioneduser = (await channel.guild.members.fetch()).find(member => member.user.tag == m[1]);
        }
        if (mentioneduser) {
          processedmessage = strReplace(processedmessage, m[0], "<@" + mentioneduser.id + ">");
        }
      }
    } while (m);

    await webhook.edit({channel: channel});
    message = await webhook.send(processedmessage, {username: username, avatarURL: user.avatarURL(), disableEveryone: true});
    
    bot.addToCache(message);

  }

  res.writeHead(302, {"Location": "/channels/" + parsedurl.query.channel + "#end"});
  res.end();
}
