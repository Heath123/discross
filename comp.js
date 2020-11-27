first

    if (lastauthor) {
      if (lastauthor.id != item.author.id || lastauthor.username != item.author.username || item.createdAt - lastdate > 420000) {
        currentmessage = message_template.replace("{$MESSAGE_CONTENT}", currentmessage);
        if (lastmember) { // Webhooks are not members!
          currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastmember.displayName));
        } else {
          currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastauthor.username));
        }
        if (lastauthor.avatarURL) {
          currentmessage = currentmessage.replace("{$PROFILE_URL}", lastauthor.avatarURL());
        }
        currentmessage = strReplace(currentmessage, "{$MESSAGE_DATE}", lastdate.toLocaleTimeString('en-US') + " " + lastdate.toDateString())
        response += currentmessage;
        currentmessage = "";
      }
    }

second

    if (lastauthor) {
      currentmessage = message_template.replace("{$MESSAGE_CONTENT}", currentmessage);
      if (lastmember) { // Webhooks are not members!
        currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastmember.displayName));
      } else {
        currentmessage = currentmessage.replace("{$MESSAGE_AUTHOR}", escape(lastauthor.username));
      }
      if (lastauthor.avatarURL) {
        currentmessage = currentmessage.replace("{$PROFILE_URL}", lastauthor.avatarURL());
      }
      response += currentmessage;
      currentmessage = "";
    }