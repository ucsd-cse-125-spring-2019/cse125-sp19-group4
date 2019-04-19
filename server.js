const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const game = require('./public/js/game.js');

app.use("/public", express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});
console.log(__dirname);

app.get('/cube_demo', function (req, res) {
  res.sendFile(__dirname + '/public/html/demo.html');
});
const inputs = [];
const movementEvents = { 'Survivor 1': new Set(), 'Survivor 2': new Set(), 'Survivor 3': new Set() }

// TODO: read from config
const max_survivors = 1;
const gameInstance = new game(max_survivors);

io.on('connection', function (socket) {
  console.log('a user connected:', socket.id);

  socket.on('play as survivor', function () {
    if (!gameInstance.joinAsSurvivor(socket.id)) {
      io.to(socket.id).emit('role already taken', 'Only three survivors are supported');
    }
    else {
      if (gameInstance.checkEnoughPlayer()) {
        // Game begins, notify all participants to enter
        game_start();
        for (let i = 0; i < gameInstance.clientSockets.length; i++) {
          io.to(gameInstance.clientSockets[i]).emit('enter game', JSON.stringify(gameInstance.socketidToPlayer));
        }
      }
      else {
        for (let i = 0; i < gameInstance.clientSockets.length; i++) {
          io.to(gameInstance.clientSockets[i]).emit('wait for game begin',
            gameInstance.numPlayersStatusToString());
        }
      }
    }
  });

  socket.on('play as god', function () {
    if (!gameInstance.joinAsGod(socket.id)) {
      io.to(socket.id).emit('role already taken', 'Only one god is supported');
    }
    else {
      if (gameInstance.checkEnoughPlayer()) {
        // Game begins, notify all participants to enter  
        for (let i = 0; i < gameInstance.clientSockets.length; i++) {
          io.to(gameInstance.clientSockets[i]).emit('enter game');
        }
      }
      else {
        for (let i = 0; i < gameInstance.clientSockets.length; i++) {
          io.to(gameInstance.clientSockets[i]).emit('wait for game begin',
            gameInstance.numPlayersStatusToString());
        }
      }
    }
  });

  socket.on('movement', function (msg) {
    movementEvents[gameInstance.socketidToPlayer[socket.id].name].add(msg);
  });

  socket.on('chat message', function (msg) {
    io.emit('chat message', socket.id + ': ' + msg);
    //inputs.push(socket.id + ': ' + msg);
  });

  socket.on('disconnect', function (reason) {
    console.log('user disconnected. Reason:', reason);
  });
});

http.listen(8080, function () {
  console.log('listening on http://127.0.0.1:8080');
});

// Server loop
// server loop tick rate, in Hz
const tick_rate = 60;
function game_start() {
  setInterval(function () {
    let start = new Date().getTime();

    inputs.forEach(function (e) {
      io.emit('chat message', e);
    });
    inputs.length = 0;

    // clean out movement inputs
    for (let i = 1; i <= 3; i++) {
      const name = 'Survivor ' + i;
      let commands = movementEvents[name];
      commands.forEach(function (e) {
        if (e == "FORWARD") {
          gameInstance.nameToObj[name].position.z -= 1;
        }
        if (e == "BACKWARD") {
          gameInstance.nameToObj[name].position.z += 1;
        }
        if (e == "LEFT") {
          gameInstance.nameToObj[name].position.x -= 1;
        }
        if (e == "RIGHT") {
          gameInstance.nameToObj[name].position.x += 1;
        }
      })
      movementEvents['Survivor ' + i].clear();
    }

    io.emit('game_status', JSON.stringify(gameInstance.nameToObj));
    let end = new Date().getTime();
    let elapse = end - start;
    if (elapse > 1000) {
      console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
    }
  }, 1000 / tick_rate);
}


// ================================= Movement ====================================
// function moveFoward(deltaTime) {
//   const velocity = this.MovementSpeed * deltaTime;
//   let temp = glMatrix.vec3.create();
//   glMatrix.vec3.scale(temp, this.Foward, velocity);
//   glMatrix.vec3.add(this.Position, this.Position, temp);
// }

// function moveBackward(deltaTime) {
//   const velocity = this.MovementSpeed * deltaTime;
//   let temp = glMatrix.vec3.create();
//   glMatrix.vec3.scale(temp, this.Foward, -velocity);
//   glMatrix.vec3.add(this.Position, this.Position, temp);
// }

// function moveLeft(deltaTime) {
//   const velocity = this.MovementSpeed * deltaTime;
//   let temp = glMatrix.vec3.create();
//   glMatrix.vec3.scale(temp, this.Right, -velocity);
//   glMatrix.vec3.add(this.Position, this.Position, temp);
// }

// function moveRight(deltaTime) {
//   const velocity = this.MovementSpeed * deltaTime;
//   let temp = glMatrix.vec3.create();
//   glMatrix.vec3.scale(temp, this.Right, velocity);
//   glMatrix.vec3.add(this.Position, this.Position, temp);
// }