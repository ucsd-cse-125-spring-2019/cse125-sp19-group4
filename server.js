let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('an user connected');

  socket.on('receive data', function(msg){
    console.log('message: ' + msg);
    socket.broadcast.emit('broadcast', msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on http://127.0.0.1:3000');
});