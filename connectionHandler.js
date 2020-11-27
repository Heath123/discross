var url = require('url')
const WebSocket = require('ws')

let wss

const sockets = []
const listenChannels = []

const messages = []
// let latestMessage = ''
let latestMessageID = 0

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sendToAll (message, channel) {
  for (const i in sockets) {
    console.log(listenChannels[i], channel)
    if (listenChannels[i] === channel) {
      sockets[i].send(message)
    }
  }
}

exports.sendToAll = sendToAll

function processMessage (connectionType, isAuthed, listenChannel, message) {
  console.log('received: %s', message)
  const split = message.split(' ')
  const action = split[0]
  const params = message.slice(action.length + 1, message.length)
  console.log('Action: ' + action + ', params: ' + params)
  if (action === 'AUTH' && connectionType === 'websockets') { // IMPORTANT TODO: Add proper auth!
    if (params === 'authpls') {
      sendToAll('Authed!')
    }
  } else if (action === 'SEND') {
    if (isAuthed || connectionType === 'longpoll') {
      sendToAll('<circuit10> ' + params)
      // latestMessage = params
      messages.push(params)
      latestMessageID += 1
    } else {
      sendToAll('Please log in')
    }
  } else if (action === 'LISTEN') { // IMPORTANT TODO: Check channel permissions
    console.log('Client listening on channel ' + params)
    listenChannel = params
  }
  return { isAuthed: isAuthed, listenChannel: listenChannel }
}

exports.processRequest = async function (req, res) {
  const parsedurl = url.parse(req.url, true)
  if (parsedurl.pathname === '/longpoll.js') {
    console.log(req.url)
    console.log('User polling (js)')
    const initialID = /* latestMessageID */ Number(req.url.slice(13, req.url.length))
    while (initialID >= latestMessageID) {
      // console.log(initialID, latestMessageID);
      await sleep(25)
    }
    res.write('latestMessageID = ' + JSON.stringify(latestMessageID) + '; addMessage(' + JSON.stringify(messages.slice(initialID, messages.length)) + '); addLongpoll(latestMessageID);')
  } else if (parsedurl.pathname === '/longpoll-xhr') {
    /* console.log(req.url);
    console.log("User polling (xhr)");
    var initialID = latestMessageID;
    while (initialID == latestMessageID) {
      await sleep(25);
    }
    res.write(JSON.stringify("<circuit10> " + latestMessage)); */
    console.log(req.url)
    console.log('User polling (xhr)')
    var initialID = /* latestMessageID */ Number(req.url.slice(14, req.url.length).split('&')[0])
    console.log(initialID)
    while (initialID >= latestMessageID) {
      // console.log(initialID, latestMessageID);
      await sleep(25)
    }
    res.write('latestMessageID = ' + JSON.stringify(latestMessageID) + '; addMessage(' + JSON.stringify(messages.slice(initialID, messages.length)) + '); longpoll_xhr(latestMessageID);')
  } else if (parsedurl.pathname === '/api.js') {
    console.log(parsedurl.query)
    processMessage('longpoll', true, parsedurl.query.message)
    // console.log(req.url);
    // res.write("send?");
    // sendToAll(req.url);
  } else {
    res.writeHead(404)
    res.write('404 not found')
  }
  res.end()
}

exports.startWsServer = function (server) {
  wss = new WebSocket.Server({ server })

  wss.on('connection', function connection (ws) {
    var index = sockets.length
    sockets.push(ws)
    listenChannels.push('')
    console.log('A client connected.')
    console.log(sockets.length + ' clients are now connected.')
    var isAuthed = true // false; TODO: Fix
    var listenChannel = ''

    ws.on('message', function incoming (message) {
      const response = processMessage('websockets', isAuthed, listenChannel, message)
      listenChannel = response.isAuthed
      listenChannels[index] = response.listenChannel
      isAuthed = response.isAuthed
    })

    ws.on('close', function close () {
      console.log('A client disconnected.')
      const index = sockets.indexOf(ws)
      if (index > -1) {
        sockets.splice(index, 1)
      }
      console.log(sockets.length + ' clients are now connected.')
    })

    // ws.send('something');
  })
}
