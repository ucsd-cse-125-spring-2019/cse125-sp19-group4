module.exports = {
    notifySurvivorDied,
    notifyAll,
    endGame
}

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 2000,
    pingTimeout: 3000,
});
const path = require('path');
const fs = require('fs');
const ini = require('ini');
const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'))
const game = require('./public/js/game.js');
const physics = require('./public/js/physics.js');
const Utils = require('./public/js/utils.js');

app.use("/public", express.static(path.join(__dirname, '/public')));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

// TODO: read from config
const physicsEngine = new physics(config.map.width, config.map.height);
const gameInstance = new game(config, physicsEngine);

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
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        const direction = JSON.parse(msg);
        movementEvents[gameInstance.socketidToPlayer[socket.id].name] = direction;
    });

    socket.on('shoot', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        shootEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('stop_shoot', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        shootEvents[gameInstance.socketidToPlayer[socket.id].name] = false;
    });

    socket.on('melee', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        meleeEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('stop_melee', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        meleeEvents[gameInstance.socketidToPlayer[socket.id].name] = false;
    });

    socket.on('jump', function () {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        jumpEvents[gameInstance.socketidToPlayer[socket.id].name] = true;
    });

    socket.on('skill', function (msg) {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        const skillParams = JSON.parse(msg)
        skillEvents[gameInstance.socketidToPlayer[socket.id].name] = skillParams;
    });

    socket.on('chat message', function (msg) {
        if (typeof gameInstance.socketidToPlayer[socket.id] === 'undefined') {
            return;
        }
        if (gameInstance.deadSurvivors.includes(gameInstance.socketidToPlayer[socket.id].name)) {
            return;
        }
        io.emit('chat message', gameInstance.socketidToPlayer[socket.id].name + ': ' + msg);
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
        data = { players: gameInstance.socketidToPlayer, objects: gameInstance.objects }
        io.to(socket).emit('enter game', JSON.stringify(data));
    });
    gameInstance.initializeFilterFunctions();
}

let elapse = 0;
let gameStartTime = null;
let then = null;
let interval = null;

function game_start() {
    gameStartTime = Date.now();
    then = Date.now();

    interval = setInterval(gameLoop, 1000 / tick_rate);
}

function gameLoop() {
    const start = Date.now();
    const deltaTime = start - then;
    then = start;
    inputs.forEach(function (e) {
        io.emit('chat message', e);
    });
    inputs.length = 0;

    gameInstance.beforeStep();
    gameInstance.decrementCoolDown(1 / tick_rate);

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
        if (shootEvents[name]) {
            gameInstance.shoot(name);
        }
    });
    Object.keys(meleeEvents).forEach((name) => {
        if (meleeEvents[name]) {
            gameInstance.melee(name);
        }
    });

    // Step and update objects
    physicsEngine.world.step(deltaTime * 0.001);
    Object.keys(gameInstance.objects).forEach(function (name) {
        gameInstance.objects[name].position = [+physicsEngine.obj[name].position.x.toFixed(3), +(physicsEngine.obj[name].position.y - gameInstance.objects[name].radius).toFixed(3), +physicsEngine.obj[name].position.z.toFixed(3)];
    });
    gameInstance.afterStep();

    const toSend = {};
    gameInstance.toSend.forEach(name => {
        toSend[name] = gameInstance.objects[name];
    });

    let end = Date.now();
    duration = Math.floor((end - gameStartTime) / 1000);

    const broadcast_status = {
        data: toSend,
        time: duration,
        toClean: gameInstance.toClean,
        debug: { looptime: elapse },
    }

    const msg = JSON.stringify(broadcast_status, Utils.stringifyReplacer)
    io.emit('game_status', msg);
    gameInstance.afterSend();
    elapse = Date.now() - start;

    if (elapse > 1000 / tick_rate) {
        console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
    }
}

function notifyAll(message, type) {
    gameInstance.clientSockets.forEach(function (socket) {
        io.to(socket).emit('notification', JSON.stringify({ message, type }));
    });
}

function notifySurvivorDied(name) {
    io.emit('Survivor Died', JSON.stringify({ name }));
}

function endGame(survivorsWon) {
    clearInterval(interval);
    if (survivorsWon) {
        io.emit('end game', 'Survivors won the game!');
    } else {
        io.emit('end game', 'God won the game!');
    }
}
