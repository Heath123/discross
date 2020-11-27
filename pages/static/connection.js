connectiontype = "none";
latest_message_id = 0;
messages = [];
isxhr = false;
authkey = "authpls";
// nocache

// https://stackoverflow.com/a/15339941
function Xhr(){ /* returns cross-browser XMLHttpRequest, or null if unable */
    try {
        return new XMLHttpRequest();
    }catch(e){}
    try {
        return new ActiveXObject("Msxml3.XMLHTTP");
    }catch(e){}
    try {
        return new ActiveXObject("Msxml2.XMLHTTP.6.0");
    }catch(e){}
    try {
        return new ActiveXObject("Msxml2.XMLHTTP.3.0");
    }catch(e){}
    try {
        return new ActiveXObject("Msxml2.XMLHTTP");
    }catch(e){}
    try {
        return new ActiveXObject("Microsoft.XMLHTTP");
    }catch(e){}
    return null;
}

function addMessage(text) {
  messages = messages.concat(text);
  // console.log(text);
  // console.log(messages);
  // var node = document.createElement("div");                 // Create a <li> node
  // var textnode = document.createTextNode(text);         // Create a text node
  // node.appendChild(textnode);                              // Append the text to <li>
  // document.getElementById("myList").appendChild(node);     // Append <li> to <ul> with id="myList"
  // ws.close();

  document.getElementById("myList").innerHTML = messages.join("<br>");
}

function addLongpoll(id) {
  addScript("/longpoll.js?" + id, 'longpollScript');
}

function addScript(src, elementID) {
  if (isxhr) {
    xhttp2.open("GET", src, true);
    xhttp2.send(null);
  } else {
    document.getElementById(elementID).innerHTML = "";
    var script = document.createElement('script');
    script.setAttribute('src', src);
    document.getElementById(elementID).appendChild(script);
  }
}

function auth() {
  if (connectiontype == "websocket") {
    send("AUTH " + authkey);
  }
}

function send(message) {
  if (connectiontype == "none") {
  } else if (connectiontype == "websocket") {
    ws.send(message);
  } else if (connectiontype == "longpoll") {
    time = (new Date()).getTime().toString();



    // alert(encodeURIComponent("test"));



    // alert(encodeURIComponent(message));



    addScript('/api.js?uid=' + 
    time + 
    '&message=' + 
    message
     + '&authkey=' + 
    authkey,
      'apiScript');
  }
}

/* document.getElementById('messagebox').onkeypress = function(e){
  if (!e) e = window.event;
  var keyCode = e.keyCode || e.which;
  if (keyCode == '13' && document.getElementById('messagebox').value != ""){
    // alert("s");
    // Enter pressed
    send("SEND " + document.getElementById('messagebox').value);
    document.getElementById('messagebox').value = "";
    return false;
  }
} */

function myFunction(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  send("SEND " + document.getElementById("messagebox").value);
  document.getElementById("messagebox").value = "";
  return false;
}

function longpoll_xhr(id) {
  xhttp.open("GET", "/longpoll-xhr?" + id + "&uid=" + (new Date()).getTime().toString(), true);
  xhttp.send(null);
}

function setup_xhr() {
  xhttp = Xhr();
  xhttp.onreadystatechange = function() {
    // alert("test " + xhttp.responseText);
    if (xhttp.readyState == 4) {
      // alert(xhttp.status);
      // alert(xhttp.responseText);
      eval(xhttp.responseText);
      // addMessage(JSON.parse(this.responseText));
      setup_xhr();
      // longpoll_xhr(latest_message_id);
    }
  }
  xhttp.open("GET", "/longpoll-xhr?" + latest_message_id, true);
  xhttp.send(null);
}

xhttp2 = Xhr();

// function WebSocketTest(usews) {




    if (window.WebSocket || window.MozWebSocket) {







        if (!window.WebSocket) {




          window.WebSocket = window.MozWebSocket;




        }





        connectiontype = "websocket";
        // Let us open a web socket
        ws = new WebSocket("wss://" + location.host + "/");

        ws.onopen = function() {
          auth();
          // Web Socket is connected, send data using send()
          // ws.send("Message to send");
          // alert("Message is sent...");
        };
        ws.onmessage = function (evt) { 
          var received_msg = evt.data;
          addMessage(received_msg);
        };
        ws.onclose = function() { 
          // websocket is closed.
          if (xhttp2) {
            connectiontype = "longpoll";
            // addLongpoll(latest_message_id);
            isxhr = true;
            setup_xhr();
            longpoll_xhr(latest_message_id);
          } else {
            connectiontype = "longpoll";
            isxhr = false
            addLongpoll(latest_message_id);
            // setup_xhr();
            // longpoll_xhr(latest_message_id);
          }
        };
    } else {
        // The browser doesn't support WebSocket maybe
        if (xhttp2) {
          connectiontype = "longpoll";
          // addLongpoll(latest_message_id);
          isxhr = true;
          setup_xhr();
          longpoll_xhr(latest_message_id);
        } else {
          connectiontype = "longpoll";
          isxhr = false
          addLongpoll(latest_message_id);
          // setup_xhr();
          // longpoll_xhr(latest_message_id);
        }
    }

// }