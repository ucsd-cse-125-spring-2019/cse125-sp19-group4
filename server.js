const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
app.use("/public", express.static(path.join(__dirname, '/public')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
console.log(__dirname);

app.get('/cube_demo', function(req, res){
  res.sendFile(__dirname + '/public/html/demo.html');
});
const inputs = [];

io.on('connection', function(socket){
  console.log('a user connected:', socket.id);
  socket.on('chat message', function(msg){
    console.log(socket.id, 'sends a chat message');
    //io.emit('chat message', socket.id + ': ' + msg);
    inputs.push(socket.id + ': ' + msg);
  });

  socket.on('disconnect', function(reason){
    console.log('user disconnected. Reason:', reason);
  });
});

http.listen(8080, function(){
  console.log('listening on http://127.0.0.1:8080');
});

// Server loop
// server loop tick rate, in Hz
const tick_rate = 10;
setInterval(function() {
  let start = new Date().getTime();
  // console.log('loop==================');
  
  inputs.forEach(function(e) {
    io.emit('chat message', e);
  });
  inputs.length = 0;

  function sleep(milliseconds) {
    var start = new Date().getTime();
    while (true) {
      if ((new Date().getTime() - start) > milliseconds){
        console.log(milliseconds + 'ms has passed!');
        break;
      }
    }
  }
  
  // sleep(1000);
  // console.log('1');
  // sleep(1000);
  // console.log('2');
  
  let end = new Date().getTime();
  let elapse = end - start;
  if (elapse > 1000) {
    console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
  }
}, 1000/tick_rate);