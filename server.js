/******************************************/
/*           Set up Static File Server    */

//Include the static file webserver library
var static = require('node-static');

// Include http server library
var http = require('http');

//Assume that we are running on Heroku
var port = process.env.PORT;
var directory = __dirname + '/public';

// If we aren't on Heroku, then we need to readjust the port and directory info and we
// know that because port won't be set.
if(typeof port == 'undefined' || !port){
  directory = './public';
  port = 8080;
}

// Set up a  static web-server that will deliver files from the filesystem
var file = new static.Server(directory);

// Construct an http server that gets files from the file Server
var app = http.createServer(
  function(request,response){
    request.addListener('end',
      function(){
        file.serve(request,response);
      }
    ).resume();
  }
).listen(port);

console.log("Server is running!");

/******************************************/
/*           Set up Web Socket Server     */

//Registry of socket_ids and player info
var players = [];

var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket) {
  function log(){
    var array = ['*** Server Log Message: '];
    for(var i = 0; i < arguments.length; i++){
      array.push(arguments[i]);
      console.log(arguments[i]);
    }
    socket.emit('log',array);
    socket.broadcast.emit('log',array);
  }

  log('Client connection by '+socket.id);



  //Join room command
  /*Payload:
      'room': room to join
      'username': username of person joining
    join_room_response:
      'result': 'success'
      'room': room joined
      'username': username that joined
      'socket_id': the socket id of the person that,
      'membership': number of people in the room including the new one
    or, if fails,
      'result': 'fail'
      'message': failure message
  */
  socket.on('join_room',function(payload){
    log('\'join_room\'command' + JSON.stringify(payload));

    //Check if client sent a payload
    if('undefined' === typeof payload || !payload){
      var error_message = 'join_room had no payload, command aborted';
      log(error_message);
      socket.emit('join_room_response',{
        result: 'fail',
        message: error_message
      });
      return;
    }

    //Check that the payload has a room to join
    var room = payload.room;
    if('undefined' === typeof room || !room){
      var error_message = 'join_room didn\'t specify a room, command aborted';
      log(error_message);
      socket.emit('join_room_response',{
        result: 'fail',
        message: error_message
      });
      return;
    }

    //Check that a username has been provided
    var username = payload.username;
    if('undefined' === typeof username || !username){
      var error_message = 'join_room didn\'t specify a username, command aborted';
      log(error_message);
      socket.emit('join_room_response',{
        result: 'fail',
        message: error_message
      });
      return;
    }

    //Store info about this new player
    players[socket.id] = {};
    players[socket.id].username = username;
    players[socket.id].room = room;

    //User actually joins room
    socket.join(room);

    //Get the room object
    var roomObject = io.sockets.adapter.rooms[room];

    //Tell everyone that someone just joined
    var numClients = roomObject.length;
    var success_data = {
      result: 'success',
      room: room,
      username: username,
      socket_id: socket.id,
      membership: numClients
    };
    io.sockets.in(room).emit('join_room_response',success_data);

    for(var socket_in_room in roomObject.sockets){
      var success_data = {
        result: 'success',
        room: room,
        username: players[socket_in_room].username,
        socket_id: socket_in_room,
        membership: numClients
      };
      socket.emit('join_room_response',success_data);
    }

    log('join_room success');

    log('Room ' + room + ' was just joined by ' + username);
  });
  socket.on('disconnect',function(){
    log('Client disconnected '+JSON.stringify(players[socket.id]));
    log(players);
    if('undefined' !== typeof players[socket.id] && players[socket.id]){
      var username = players[socket.id].username;
      var room = players[socket.id].room;
      var payload = {
        username: username,
        socket_id: socket.id
      };
    delete players[socket.id];
    io.in(room).emit('player_disconnected',payload);
    }
  });

//Send message command
/*Payload:
    'room': room to join
    'message': the message to send
  send_message_response:
    'result': 'success'
    'username': username that spoke
    'message': the message spoken
  or, if fails,
    'result': 'fail'
    'message': failure message
*/

socket.on('send_message',function(payload){
  log('Server received a command','join_room',payload);
  if('undefined' === typeof payload || !payload){
    var error_message = 'send_message had no payload, command aborted';
    log(error_message);
    socket.emit('send_message_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  var room = payload.room;
  if('undefined' === typeof room || !room){
    var error_message = 'send_message didn\'t specify a room, command aborted';
    log(error_message);
    socket.emit('send_message_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  var username = players[socket.id].username;
  if('undefined' === typeof username || !username){
    var error_message = 'send_message didn\'t specify a username, command aborted';
    log(error_message);
    socket.emit('send_message_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var message = payload.message;
  if('undefined' === typeof message || !message){
    var error_message = 'send_message didn\'t specify a message, command aborted';
    log(error_message);
    socket.emit('send_message_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var success_data = {
    result: 'success',
    room: room,
    username: username,
    message: message
  };
  io.in(room).emit('send_message_response',success_data);
  log('Message sent to ' + room + ' by ' + username);
});

//Invite command
/*Payload:
    'requested_user: the socket id of the person to be invited
  invite_response:
    'result': 'success'
    'username': the socket id of the person being invited
  invite_response:
    'result': 'success'
    'username': the socket id of the person being invited
  or, if fails,
    'result': 'fail'
    'message': failure message
*/

socket.on('invite',function(payload){
  log('Invite with ' + JSON.stringify(payload));

  //Make sure that a payload was sent
  if('undefined' === typeof payload || !payload){
    var error_message = 'invite had no payload, command aborted';
    log(error_message);
    socket.emit('invite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //Check that the message can be traced to a username
  var username = players[socket.id].username;
  if('undefined' === typeof username || !username){
    var error_message = 'invitune didn\'t specify a username, command aborted';
    log(error_message);
    socket.emit('invite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var requested_user = payload.requested_user;
  if('undefined' === typeof requested_user || !requested_user){
    var error_message = 'invite didn\'t specify a requested_user, command aborted';
    log(error_message);
    socket.emit('invite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var room = players[socket.id].room;
  var roomObject = io.sockets.adapter.rooms[room];

  //Make sure invited player is in the room
  if(!roomObject.sockets.hasOwnProperty(requested_user)){
    var error_message = 'invite requested a user not present in the room, command aborted';
    log(error_message);
    socket.emit('invite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //If everything is ok respond to the inviter that it was successful
  var success_data = {
    result: 'success',
    socket_id: requested_user
  };
  io.sockets.in(room).emit('invite_response',success_data);

  //Tell the invitee that they have been invited
  var success_data = {
    result: 'success',
    socket_id: socket.id
  };
  socket.to(requested_user).emit('invited',success_data);

  log('invite successful');
});

//Uninvite command
/*Payload:
    'requested_user: the socket id of the person to be uninvited
  uninvite_response:
    'result': 'success'
    'username': the socket id of the person being uninvited
  or,
  'result': 'fail'
  'message': failure message
  uninvited:
    'result': 'success'
    'username': the socket id of the person being uninvited
  or, if fails,
    'result': 'fail'
    'message': failure message
*/

socket.on('uninvite',function(payload){
  log('Uninvite with ' + JSON.stringify(payload));

  //Make sure that a payload was sent
  if('undefined' === typeof payload || !payload){
    var error_message = 'uninvite had no payload, command aborted';
    log(error_message);
    socket.emit('uninvite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //Check that the message can be traced to a username
  var username = players[socket.id].username;
  if('undefined' === typeof username || !username){
    var error_message = 'uninvite didn\'t specify a username, command aborted';
    log(error_message);
    socket.emit('uninvite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var requested_user = payload.requested_user;
  if('undefined' === typeof requested_user || !requested_user){
    var error_message = 'uninvite didn\'t specify a requested_user, command aborted';
    log(error_message);
    socket.emit('uninvite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var room = players[socket.id].room;
  var roomObject = io.sockets.adapter.rooms[room];

  //Make sure invited player is in the room
  if(!roomObject.sockets.hasOwnProperty(requested_user)){
    var error_message = 'invite requested a user not present in the room, command aborted';
    log(error_message);
    socket.emit('invite_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //If everything is ok respond to the inviter that it was successful
  var success_data = {
    result: 'success',
    socket_id: requested_user
  };
  io.sockets.in(room).emit('uninvite_response',success_data);

  //Tell the uninvitee that they have been uninvited
  var success_data = {
    result: 'success',
    socket_id: socket.id
  };
  socket.to(requested_user).emit('uninvited',success_data);

  log('Uninvite successful');
});


//game_start command
/*Payload:
    'requested_user: the socket id of the person to play with
  uninvite_response:
    'result': 'success'
    'username': the socket id of the person you are playing with
    'game_id': id of the game session
  or,
  'result': 'fail'
  'message': failure message
*/
socket.on('game_start',function(payload){
  log('game_start with ' + JSON.stringify(payload));

  //Make sure that a payload was sent
  if('undefined' === typeof payload || !payload){
    var error_message = 'game_start had no payload, command aborted';
    log(error_message);
    socket.emit('game_start_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //Check that the message can be traced to a username
  var username = players[socket.id].username;
  if('undefined' === typeof username || !username){
    var error_message = 'game_start didn\'t specify a username, command aborted';
    log(error_message);
    socket.emit('game_start_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var requested_user = payload.requested_user;
  if('undefined' === typeof requested_user || !requested_user){
    var error_message = 'game_start didn\'t specify a requested_user, command aborted';
    log(error_message);
    socket.emit('game_start_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }
  var room = players[socket.id].room;
  var roomObject = io.sockets.adapter.rooms[room];

  //Make sure invited player is in the room
  if(!roomObject.sockets.hasOwnProperty(requested_user)){
    var error_message = 'game_start requested a user not present in the room, command aborted';
    log(error_message);
    socket.emit('game_start_response',{
      result: 'fail',
      message: error_message
    });
    return;
  }

  //If everything is ok respond to the game starter that it was successful
  var game_id = Math.floor((1+Math.random()) * 0x10000).toString(16).substring(1);
  var success_data = {
    result: 'success',
    socket_id: requested_user,
    game_id: game_id
  };
  io.sockets.in(room).emit('game_start_response',success_data);

  //Tell the player to play
  var success_data = {
    result: 'success',
    socket_id: socket.id,
    game_id: game_id
  };
  socket.to(requested_user).emit('game_start_response',success_data);

  log('game_start successful');
});





});
