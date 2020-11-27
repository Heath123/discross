var fs = require('fs');
var minify = require('html-minifier').minify;
var escape = require('escape-html');
var md = require('markdown-it')({breaks: true, linkify: true});
var he = require('he'); // Encodes HTML attributes

// Minify at runtime to save data on slow connections, but still allow editing the unminified file easily
// Is that a bad idea?

// Templates for viewing the messages in a channel
const channel_template = minify(fs.readFileSync('pages/templates/channel.html', 'utf-8'));

const message_template = minify(fs.readFileSync('pages/templates/message/message.html', 'utf-8'));
const first_message_content_template = minify(fs.readFileSync('pages/templates/message/first_message_content.html', 'utf-8'));
const merged_message_content_template = minify(fs.readFileSync('pages/templates/message/merged_message_content.html', 'utf-8'));
const mention_template = minify(fs.readFileSync('pages/templates/message/mention.html', 'utf-8'));

const input_template = minify(fs.readFileSync('pages/templates/channel/input.html', 'utf-8'));
const input_disabled_template = minify(fs.readFileSync('pages/templates/channel/input_disabled.html', 'utf-8'));

const no_message_history_template = minify(fs.readFileSync('pages/templates/channel/no_message_history.html', 'utf-8'));

function strReplace(string, needle, replacement) {
  return string.split(needle).join(replacement||"");
};

// https://stackoverflow.com/questions/1967119/why-does-javascript-replace-only-first-instance-when-using-replace

exports.processChannel = async function processChannel(bot, req, res, args, discordID) {
  try {
    response = "";
    chnl = await bot.client.channels.fetch(args[2]);
  } catch (err) {
    chnl = undefined;
  }

  if (chnl) {
    member = await chnl.guild.members.fetch(discordID);
    user = member.user;
    username = user.tag;
    if (member.displayName != user.username) {
      username = member.displayName + " (@" + user.tag + ")";
    }

    if (!member.permissionsIn(chnl).has("VIEW_CHANNEL", true)) {
      res.write("You don't have permission to do that!");
      res.end();
      return;
    }

    if (!member.permissionsIn(chnl).has("READ_MESSAGE_HISTORY", true)) {
      template = strReplace(channel_template, "{$SERVER_ID}", chnl.guild.id)
      template = strReplace(template, "{$CHANNEL_ID}", chnl.id)

      if (member.permissionsIn(chnl).has("SEND_MESSAGES", true)) {
        final = strReplace(template, "{$INPUT}", input_template);
      } else {
        final = strReplace(template, "{$INPUT}", input_disabled_template);
      }
      final = strReplace(final, "{$MESSAGES}", no_message_history_template); // You do not have permission... message

      res.write(final); //write a response to the client
      res.end(); //end the response
      return;
    }

    console.log("Processed valid channel request");
    messages = await bot.getHistoryCached(chnl);
    lastauthor = undefined;
    lastmember = undefined;
    lastdate = new Date('1995-12-17T03:24:00');
    currentmessage = "";
    islastmessage = false;

    handlemessage = async function (item) { // Save the function to use later in the for loop and to process the last message
      if (lastauthor) { // Only consider the last message if this is not the first
        // If the last message is not going to be merged with this one, put it into the response
        if (islastmessage || lastauthor.id != item.author.id || lastauthor.username != item.author.username || item.createdAt - lastdate > 420000) {
          
          
          currentmessage = message_template.replace("{$MESSAGE_CONTENT}", currentmessage);
          if (lastmember) { // Webhooks are not members!
            currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastmember.displayName));
          } else {
            currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastauthor.username));
          }

          var url = lastauthor.avatarURL();
          if (lastauthor.avatarURL && url && url.toString().startsWith("http")) { // Sometimes the URL is null or something else
            currentmessage = currentmessage.replace("{$PROFILE_URL}", url);
          }
          currentmessage = strReplace(currentmessage, "{$MESSAGE_DATE}", lastdate.toLocaleTimeString('en-US') + " " + lastdate.toDateString());
          currentmessage = strReplace(currentmessage, "{$TAG}", he.encode(JSON.stringify("@" + lastauthor.tag)));
          response += currentmessage;
          currentmessage = "";
        }
      }

      if (!item) { // When processing the last message outside of the forEach item is undefined
        return;
      }

      // messagetext = strReplace(escape(item.content), "\n", "<br>");
      messagetext = /* strReplace( */ md.renderInline(item.content) /* , "\n", "<br>") */;
      if (item.mentions) {
        item.mentions.members.forEach(function(user) {
          if (user) {
            messagetext = strReplace(messagetext, "&lt;@" + user.id.toString() + "&gt;", mention_template.replace("{$USERNAME}", escape("@" + user.displayName)));
            messagetext = strReplace(messagetext, "&lt;@!" + user.id.toString() + "&gt;", mention_template.replace("{$USERNAME}", escape("@" + user.displayName)));
          }
        });
      }

      // https://stackoverflow.com/questions/6323417/regex-to-extract-all-matches-from-string-using-regexp-exec

      var regex = /&lt;#([0-9]{18})&gt;/g; // Regular expression to detect channel IDs
      var m;

      do {
        m = regex.exec(messagetext);
        if (m) {
          try {
            channel = await bot.client.channels.cache.get(m[1]);
          } catch(err) {
            console.log(err);
          }
          if (channel) {
            messagetext = strReplace(messagetext, m[0], mention_template.replace("{$USERNAME}", escape("#" + channel.name)));
          }
        }
      } while (m);

      messagetext = strReplace(messagetext, "@everyone", mention_template.replace("{$USERNAME}", "@everyone"));
      messagetext = strReplace(messagetext, "@here", mention_template.replace("{$USERNAME}", "@here"));

      

      // If the last message is not going to be merged with this one, use the template for the first message, otherwise use the template for merged messages
      if (!lastauthor || lastauthor.id != item.author.id || lastauthor.username != item.author.username || item.createdAt - lastdate > 420000) {
        messagetext = first_message_content_template.replace("{$MESSAGE_TEXT}", messagetext);
      } else {
        messagetext = merged_message_content_template.replace("{$MESSAGE_TEXT}", messagetext);
      }

      lastauthor = item.author;
      lastmember = item.member;
      lastdate = item.createdAt;
      currentmessage += messagetext;

    }

    for (const item of messages) {
      await handlemessage(item);
    }

    // Handle the last message
    // Uses the function in the foreach from earlier

    islastmessage = true;
    await handlemessage();

    template = strReplace(channel_template, "{$SERVER_ID}", chnl.guild.id)
    template = strReplace(template, "{$CHANNEL_ID}", chnl.id)
    template = strReplace(template, "{$REFRESH_URL}", chnl.id + "?random=" + Math.random() + "#end")

    if (member.permissionsIn(chnl).has("SEND_MESSAGES", true)) {
      final = strReplace(template, "{$INPUT}", input_template);
    } else {
      final = strReplace(template, "{$INPUT}", input_disabled_template);
    }
    final = strReplace(final, "{$MESSAGES}", response);

  res.writeHead(200, { "Content-Type": "text/html" });
    res.write(final); //write a response to the client
    res.end(); //end the response
  } else {
  res.writeHead(404, { "Content-Type": "text/html" });
    res.write("Invalid channel!"); //write a response to the client
    res.end(); //end the response
  }
}
