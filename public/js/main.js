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

var chat_room = getURLParam('game_id');
if('undefined' == typeof chat_room || !chat_room){
  chat_room = 'Lobby';
}

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
  //If we are being notified that we joined the room, then ignore
  if(payload.socket_id === socket.id){
    return;
  }
  //If someone joined then add a new row to the lobby table
  var dom_elements = $('.socket_' + payload.socket_id);

  //If we don't already have an entry for this person
  if(dom_elements.length === 0){
    var nodeA  = $('<div></div>');
    nodeA.addClass('socket_' + payload.socket_id);
    var nodeB  = $('<div></div>');
    nodeB.addClass('socket_' + payload.socket_id);
    var nodeC  = $('<div></div>');
    nodeC.addClass('socket_' + payload.socket_id);

    nodeA.addClass('w-100');
    nodeB.addClass('col-9 text-right');
    nodeB.append('<h4>' + payload.username + '</h4>');

    nodeC.addClass('col-3 text-left');
    var buttonC = makeInviteButton(payload.socket_id);
    nodeC.append(buttonC);

    nodeA.hide();
    nodeB.hide();
    nodeC.hide();
    $('#players').append(nodeA, nodeB, nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
    nodeC.slideDown(1000);
  }
  else{ //Maybe someone rejoined?
    uninvite(payload.socket_id);
    var buttonC = makeInviteButton(payload.socket_id);
    $('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
    dom_elements.slideDown(1000);

  }
  var newHTML = '<p><b>' +payload.username + '</b> just entered the Lobby. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').prepend(newNode);
  newNode.slideDown(1000);
});

//What to do when the server says that someone has left
socket.on('player_disconnected',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  //If we are being notified that we left the room, then ignore
  if(payload.socket_id === socket.id){
    alert("You left the game!")
    return;
  }
  //If someone left the room then animate out all their content
  var dom_elements = $('.socket_' + payload.socket_id);


  if(dom_elements.length != 0){
    dom_elements.slideUp(1000);
  }

  var newHTML = '<p><b>' +payload.username + '</b> just left the Lobby. </p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').prepend(newNode);
  newNode.slideDown(1000);
});

function invite(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log message: \'invite\' payload:' + JSON.stringify(payload));
  socket.emit('invite',payload);
}

socket.on('invite_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInvitedButton(payload.socket_id);
  $('.socket_' + payload.socket_id+' button').replaceWith(newNode);
});

socket.on('invited',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makePlayButton(payload.socket_id);
  $('.socket_' + payload.socket_id+' button').replaceWith(newNode);
});


//Send an uninvite message to the server
function uninvite(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log message: \'uninvite\' payload:' + JSON.stringify(payload));
  socket.emit('uninvite',payload);
}
//Handle response after sending an uninvte message to server
socket.on('uninvite_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInviteButton(payload.socket_id);
  $('.socket_' + payload.socket_id+' button').replaceWith(newNode);
});
//Handle notification that we have been uninvited
socket.on('uninvited',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInviteButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
});

//Send a game_start message to the server
function game_start(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log message: \'game_start\' payload:' + JSON.stringify(payload));
  socket.emit('game_start',payload);
}
//Handle notification that we have been engaged
socket.on('game_start_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeEngagedButton(payload.socket_id);
  $('.socket_' + payload.socket_id+' button').replaceWith(newNode);

  //Jump to a new page!
  window.location.href = 'game.html?username=' + username + '&game_id=' + payload.game_id;
});


function send_message(){
    var payload = {};
    payload.room = chat_room;
    payload.message = document.getElementById('send_message_holder').value;
    document.getElementById('send_message_holder').value = "";
    console.log('*** Client Log Message: \'send_message\' payload: '+JSON.stringify(payload));
    socket.emit('send_message',payload);
}

socket.on('send_message_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newHTML = '<p><b>'+payload.username+' says: </b>'+ payload.message +'</p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').prepend(newNode);
  newNode.fadeIn(500);
  //window.scrollTo(0,document.body.scrollHeight); Used to scroll to bottom of screen to view most recent message
});

function makeInviteButton(socket_id){
  var newHTML = '<button type="button" class="btn btn-outline-primary">Invite</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    invite(socket_id);
  });
  return(newNode);
}

function makeInvitedButton(socket_id){
  var newHTML = '<button type="button" class="btn btn-primary">Invited</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    uninvite(socket_id);
  });
  return(newNode);
}

function makePlayButton(socket_id){
  var newHTML = '<button type="button" class="btn btn-success">Play</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    game_start(socket_id);
  });
  return(newNode);
}

function makeEngagedButton(){
  var newHTML = '<button type="button" class="btn btn-danger">Engaged</button>';
  var newNode = $(newHTML);
  return(newNode);
}

document.body.onload = function(){
  var payload = {};
  payload.room = chat_room;
  payload.username = username;

  console.log('*** Client Log Message: \'join_room\' payload: '+JSON.stringify(payload));
  socket.emit('join_room',payload);
}
