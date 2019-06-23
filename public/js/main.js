// Functions for general use

//This function returns the value associated with 'whichParam' on the URL
function getURLParam(whichParam){
  var pageURL = window.location.search.substring(1);
  var pageURLVar = pageURL.split('&');
  for(var i = 0; i < pageURLVar.length; i++){
    var paramName = pageURLVar[i].split('=');
    if(paramName[0] == whichParam){
      return paramName[1];
    }
  }
}
var username = getURLParam('username');
if('undefined' == typeof username || !username){
  username = "Anonymous_" + Math.floor(Math.random() * 200);
}

var chat_room = 'One_Room';

//Connect to the socket server
var socket = io.connect();

socket.on('log',function(array){
  console.log.apply(console,array);
});

socket.on('join_room_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  document.getElementById("messages").innerHTML += '<p>New user joined the room: '+payload.username+'</p>';
});

socket.on('send_message_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  document.getElementById("messages").innerHTML += '<p><b>'+payload.username+' says: </b>'+ payload.message +'</p>';
  window.scrollTo(0,document.body.scrollHeight);
})

function send_message(){
    var payload = {};
    payload.room = chat_room;
    payload.username = username;
    payload.message = document.getElementById('send_message_holder').value;
    document.getElementById('send_message_holder').value = "";
    console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
    socket.emit('send_message',payload);
}


document.body.onload = function(){
  var payload = {};
  payload.room = chat_room;
  payload.username = username;

  console.log('*** Client Log Message: \'join_room\' payload: '+JSON.stringify(payload));
  socket.emit('join_room',payload);
}
