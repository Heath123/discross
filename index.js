const fs = require('fs')
const url = require('url')
const mime = require('mime-types').lookup

const bot = require('./bot.js')
const connectionHandler = require('./connectionHandler.js')

const options = {}

try { // Use HTTPS if keys are available
  options.key = fs.readFileSync('secrets/key.pem')
  options.cert = fs.readFileSync('secrets/cert.pem')
  console.log('Found keys - using HTTPS!')
} catch (err) {
  console.log('No keys found - using HTTP!')
}

const usinghttps = !!options.key
const http = usinghttps ? require('https') : require('http')

var auth = require('./authentication.js')
auth.setHTTPS(usinghttps) // Determines whether cookies have the Secure; option

var indexpage = require('./pages/index.js')
var loginpage = require('./pages/login.js')
var guestpage = require('./pages/guest.js')
var registerpage = require('./pages/register.js')
var forgotpage = require('./pages/forgot.js')
var channelpage = require('./pages/channel.js')
var serverpage = require('./pages/server.js')
var sendpage = require('./pages/send.js')

bot.startBot()

function strReplace (string, needle, replacement) {
  return string.split(needle).join(replacement || '')
};
// https://stackoverflow.com/questions/1967119/why-does-javascript-replace-only-first-instance-when-using-replace

// create a server object:
const server = http.createServer(options)
connectionHandler.startWsServer(server)

async function servePage (filename, res, type, textToReplace, replacement) { // textToReplace and replacement allow for dynamic pages (not used anymore as far as I know)
  if (!type) {
    type = mime(filename)
  }
  if (filename.endsWith('/')) {
    filename += 'index.html'
  }
  fs.readFile(filename, function (err, data) {
    if (err) {
      if (filename.endsWith('index.html')) {
        res.writeHead(404, { 'Content-Type': type })
        return res.end('404 Not Found')
      } else {
        servePage(filename + '/index.html', res)
        return
      }
    }
    res.writeHead(200, { 'Content-Type': type })
    if (textToReplace && replacement) {
      res.write(data.toString().replace(textToReplace, replacement))
    } else {
      res.write(data)
    }
    return res.end()
  })
}

server.on('request', async (req, res) => {
  console.log(req.url)
  if (req.method === 'POST') {
    let body = '' // https://itnext.io/how-to-handle-the-post-request-body-in-node-js-without-using-a-framework-cd2038b93190
    req.on('data', chunk => {
      body += chunk.toString() // convert Buffer to string
    })
    req.on('end', () => {
      auth.handleLoginRegister(req, res, body)
    })
  } else {
    const parsedurl = url.parse(req.url, true)

    const args = strReplace(parsedurl.pathname, '?', '/').split('/') // Split by / or ?

    if (args[1] === 'send') {
      const discordID = await auth.checkAuth(req, res)
      if (discordID) {
        sendpage.sendMessage(bot, req, res, args, discordID)
      }
    } else if (args[1] === 'logout') {
      const discordID = await auth.checkAuth(req, res, true) // True = no redirect to login page
      if (discordID) {
        auth.logout(discordID)
      }
      res.writeHead(302, { Location: '/' })
      res.end()
    } else if (args[1] === 'server') {
      const discordID = await auth.checkAuth(req, res)
      if (discordID) {
        serverpage.processServer(bot, req, res, args, discordID)
      }
    } else if (args[1] === 'channels') {
      const discordID = await auth.checkAuth(req, res)
      if (discordID) {
        channelpage.processChannel(bot, req, res, args, discordID)
      }
    } else if (args[1] === 'login.html') {
      loginpage.processLogin(bot, req, res, args)
    } else if (args[1] === 'guest.html') {
      guestpage.processGuestLogin(bot, req, res, args)
    } else if (args[1] === 'register.html') {
      registerpage.processRegister(bot, req, res, args)
    } else if (args[1] === 'forgot.html') {
      forgotpage.processForgot(bot, req, res, args)
    } else if (args[1] === 'index.html' || parsedurl.pathname === '/') {
      indexpage.processIndex(bot, req, res, args)
    } else if (args[1] === 'longpoll.js' || args[1] === 'longpoll-xhr' || args[1] === 'api.js') { // Connection
      connectionHandler.processRequest(req, res)
    } else {
      let filename = 'pages/static' + parsedurl.pathname
      filename = strReplace(filename, '..', '') // Attempt to stop private files from being served
      await servePage(filename, res)
    }
  }
})

server.listen(4000)
