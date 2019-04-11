let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);
let path = require('path');
app.use("/public", express.static(path.join(__dirname, '/public')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('client to server', function(obj){
    console.log('msg from client: ' + obj.number);
    console.log('msg from client: ' + obj.string);
    console.log('msg from client: ' + obj.array);
    console.log('msg from client: ' + obj.myObj.name);

    class TestObj{
        constructor(name) {
            this.name = name;
        }
    }
    class Data {
        constructor(number, string, array, myObj) {
            this.number = number;
            this.string = string;
            this.array = array;
            this.myObj = myObj;
        }
    }
    let testObj = new TestObj('Test');
    // JavaScript numbers are always stored as double precision floating point numbers
    let array = new Array(8.0, 234.3434, 23, -234, -5.0);
    let data = new Data(-5.6, 'data2', array, testObj);
    io.sockets.emit('broadcast', data);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(8080, function(){
  console.log('listening on http://127.0.0.1:8080');
});