const fs = require('fs')
const Discord = require('discord.js')
const auth = require('./authentication.js')
const connectionHandler = require('./connectionHandler.js')

const cachelength = 100 // Length of message history

const msghistory = {}
const client = new Discord.Client({ partials: ['MESSAGE'] }) // Allows me to recieve "uncached" (actually manually cached by me) message events

setInterval(function () { // TODO: See if this is needed
  client.user.setActivity('for people at https://discross.cloud', { type: 'WATCHING' })
}, 20000)

// https://stackoverflow.com/questions/1967119/why-does-javascript-replace-only-first-instance-when-using-replace

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  // console.log(client.channels.array());
})

client.on('message', async function (msg) {
  if (msghistory[msg.channel.id] && !(msghistory[msg.channel.id].get(msg.id))) {
    msghistory[msg.channel.id].set(msg.id, msg)

    if (msghistory[msg.channel.id].length > cachelength) {
      msghistory[msg.channel.id] = msghistory[msg.channel.id].slice(msghistory[msg.channel.id].length - (cachelength + 1), msghistory[msg.channel.id].length) // Limit the length of the cache to 50 messages
    }
  }

  // console.log(msghistory[msg.channel.id.toString()].length);
  if (msg.content === '^connect') {
    if (msg.webhookID) {
      msg.reply("you're already using Discross!")
    } else {
      if (msg.guild.id === '421771267100901377' || msg.guild.id === '439461201731387392') {
        msg.author.send('Verification code:\n`' + (await auth.createVerificationCode(msg.author.id)) + '`')
        msg.reply('you have been sent a direct message with your verification code.')
      } else {
        msg.author.send('Please join The Wii Hacking house to register.\nhttps://discord.gg/pXdeUqb')
        msg.reply('please join The Wii Hacking house to register.')
      }
    }
  }

  // TODO: Do properly
  connectionHandler.sendToAll(msg.content, msg.channel.id)
})

// client.on('messageDelete

exports.startBot = async function () {
  client.login(fs.readFileSync('secrets/token.txt', 'utf-8').replace('\n', ''))
}

exports.addToCache = function (msg) {
  if (msghistory[msg.channel.id]) {
    msghistory[msg.channel.id].set(msg.id, msg)
  }
}

exports.getHistoryCached = async function (chnl) {
  if (!chnl.id) {
    chnl = client.channels.get(chnl)
  }
  if (!msghistory[chnl.id]) {
    const messagearray = await chnl.messages.fetch({ limit: cachelength })
    msghistory[chnl.id] = messagearray.sort((messageA, messageB) => messageA.createdTimestamp - messageB.createdTimestamp)
  }
  return Array.from(msghistory[chnl.id].values())
}

exports.client = client
