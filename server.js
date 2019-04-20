const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 2000,
    pingTimeout: 1500,
});
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



// TODO: read from config
const max_survivors = 1;
const gameInstance = new game(max_survivors);

const inputs = [];
const movementCommands = {};
const movementDirections = {};


io.on('connection', function (socket) {
    console.log(socket.id, 'connected');

    socket.on('play as survivor', function () {
        if (!gameInstance.joinAsSurvivor(socket.id)) {
            io.to(socket.id).emit('role already taken', 'Only three survivors are supported');
        }
        else {
            if (gameInstance.checkEnoughPlayer()) {
                // Game begins, notify all participants to enter
                game_start();
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('enter game', JSON.stringify(gameInstance.socketidToPlayer));
                });
            }
            else {
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('wait for game begin', gameInstance.numPlayersStatusToString());
                });
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
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('enter game', JSON.stringify(gameInstance.socketidToPlayer));
                });
            }
            else {
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('wait for game begin', gameInstance.numPlayersStatusToString());
                });
            }
        }
    });

    socket.on('movement', function (msg) {
        const name = gameInstance.socketidToPlayer[socket.id].name;
        const movement = JSON.parse(msg);
        if (!(movement.command in movementCommands[name])) {
            movementCommands[name].add(movement.command);
            movementDirections[name].add(movement.direction);
        }
    });

    socket.on('chat message', function (msg) {
        io.emit('chat message', socket.id + ': ' + msg);
        //inputs.push(socket.id + ': ' + msg);
    });

    socket.on('disconnect', function (reason) {
        console.log(socket.id, 'disconnected. Reason:', reason);
    });
});

http.listen(8080, function () {
    console.log('listening on http://127.0.0.1:8080');
});

// Server loop
// server loop tick rate, in Hz
const tick_rate = 60;
function game_start() {

    gameInstance.clientSockets.forEach(function (socket) {
        movementCommands[gameInstance.socketidToPlayer[socket].name] = new Set();
        movementDirections[gameInstance.socketidToPlayer[socket].name] = new Set();
    });

    let then = 0;
    let elapse = 0;
    setInterval(function () {
        let start = new Date().getTime();
        const deltaTime = start - then;
        then = start;
        inputs.forEach(function (e) {
            io.emit('chat message', e);
        });
        inputs.length = 0;

        // clean out movement inputs
        Object.keys(movementDirections).forEach(function (name) {
            movementDirections[name].forEach(function (direction) {
                gameInstance.move(name, direction, deltaTime);
            })
            movementCommands[name].clear();
            movementDirections[name].clear();
        });
        const broadcast_status = JSON.stringify(gameInstance.objects);
        // const debug_info = {
        //     server_loop_time: elapse,
        // }
        io.emit('game_status', broadcast_status);
        let end = new Date().getTime();
        elapse = end - start;
        
        if (elapse > 1000 / tick_rate) {
            console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
        }
    }, 1000 / tick_rate);
}