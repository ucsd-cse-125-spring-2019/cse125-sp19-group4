const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 2000,
    pingTimeout: 3000,
});
const path = require('path');
const game = require('./public/js/game.js');
const physics = require('./public/js/physics.js');
const Utils = require('./public/js/utils.js');

app.use("/public", express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// TODO: read from config
const max_survivors = 0;
const physicsEngine = new physics();
const gameInstance = new game(max_survivors, physicsEngine);

const inputs = [];
const movementEvents = {};
const jumpEvents = {};
const skillEvents = {};
const shootEvents = {};
const meleeEvents = {};


io.on('connection', function (socket) {
    console.log(socket.id, 'connected');

    socket.on('play as survivor', function (msg) {
        if (!gameInstance.joinAsSurvivor(socket.id, JSON.parse(msg))) {
            io.to(socket.id).emit('role already taken', 'Only three survivors are supported');
        }
        else {
            if (gameInstance.checkEnoughPlayer()) {
                enterGame();
            }
            else {
                let status = {
                    playerCount: gameInstance.playerCount,
                    statusString: gameInstance.numPlayersStatusToString()
                }
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('wait for game begin', JSON.stringify(status));
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
                enterGame();
            }
            else {
                let status = {
                    playerCount: gameInstance.playerCount,
                    statusString: gameInstance.numPlayersStatusToString()
                }
                gameInstance.clientSockets.forEach(function (socket) {
                    io.to(socket).emit('wait for game begin', JSON.stringify(status));
                });
            }
        }
    });

    socket.on('movement', function (msg) {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        const direction = JSON.parse(msg);
        movementEvents[gameInstance.socketidToPlayer[socket.id].name] = direction;
    });

    socket.on('shoot', function () {
        shootEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('melee', function () {
        meleeEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('jump', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        jumpEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('skill', function (msg) {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        const skillParams = JSON.parse(msg)
        skillEvents[gameInstance.socketidToPlayer[socket.id].name] = skillParams;
    });

    socket.on('chat message', function (msg) {
        io.emit('chat message', gameInstance.socketidToPlayer[socket.id].name + ': ' + msg);
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

function enterGame() {
    // Game begins, notify all participants to enter
    game_start();
    gameInstance.clientSockets.forEach(function (socket) {
        data = {players: gameInstance.socketidToPlayer, objects: gameInstance.objects}
        io.to(socket).emit('enter game', JSON.stringify(data));
    });
    gameInstance.setToJSONFunctions();
}


function game_start() {
    const gameStartTime = Date.now();
    let then = Date.now();
    let elapse = 0;

    setInterval(function () {
        let start = Date.now();
        const deltaTime = start - then;
        then = start;
        inputs.forEach(function (e) {
            io.emit('chat message', e);
        });
        inputs.length = 0;

        gameInstance.clearKeys();
        gameInstance.decrementCoolDown(1/tick_rate);

        // Handle Movements
        Object.keys(movementEvents).forEach((name) => {
            if (movementEvents[name] === 'stay') {
                gameInstance.stay(name);
            } else {
                gameInstance.move(name, movementEvents[name]);
            }
        });

        // Handle jumps
        Object.keys(jumpEvents).forEach((name) => {
            gameInstance.jump(name);
            delete jumpEvents[name];
        });

        // Handle skill
        Object.keys(skillEvents).forEach((name) => {
            gameInstance.handleSkill(name, skillEvents[name]);
            delete skillEvents[name];
        });

        // Handle attacks
        Object.keys(shootEvents).forEach((name) => {
            gameInstance.shoot(name, shootEvents[name]);
            delete shootEvents[name];
        });
        Object.keys(meleeEvents).forEach((name) => {
            gameInstance.melee(name, meleeEvents[name]);
            delete meleeEvents[name];
        });

        // Step and update objects
        gameInstance.beforeStep();
        physicsEngine.world.step(deltaTime * 0.001);
        gameInstance.afterStep();

        Object.keys(physicsEngine.obj).forEach(function (name) {
            gameInstance.objects[name].position = [physicsEngine.obj[name].position.x, physicsEngine.obj[name].position.y - gameInstance.objects[name].radius, physicsEngine.obj[name].position.z];
        });

        let end = Date.now();
        elapse = end - start;
        duration = Math.floor((end - gameStartTime) / 1000);
        
        const broadcast_status = {
            data: gameInstance.objects,
            time: duration,
            toClean: gameInstance.toClean,
        }

        const msg = JSON.stringify(broadcast_status, Utils.stringifyReplacer)
        // console.log(msg)
        io.emit('game_status', msg);

        gameInstance.afterSend();

        if (elapse > 1000 / tick_rate) {
            console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
        }
    }, 1000 / tick_rate);
}
