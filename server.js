const tick_rate = 60;

module.exports = {
    notifySurvivorDied,
    notifySurvivorRevived,
    notifyAll,
    endGame,
    tick_rate,
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

const names = {};
const professionPicks = {};
const readys = [];


io.on('connection', function (socket) {
    console.log(socket.id, 'connected');

    socket.on('name submitted', function(name) {
        for (let key in names) {
            if (names[key] === name) {
                io.to(socket.id).emit('name already taken');
                return;
            }
        }
        names[socket.id] = name;
        io.to(socket.id).emit('enter lobby');

        let picks = {}
        for (let socketId in professionPicks) {
            picks[names[socketId]] = {
                profession: professionPicks[socketId], 
                ready: readys.indexOf(socketId) >= 0
            };
        }
        io.emit('profession picked', JSON.stringify(picks))
    });

    socket.on('play as survivor', function (msg) {
        let index = readys.indexOf(socket.id);      

        // already picked the same profession
        if (JSON.parse(msg) === professionPicks[socket.id]) {
            return;
        }

        if (index > -1) {
            readys.splice(index, 1);
            io.to(socket.id).emit('unready');
        }

        professionPicks[socket.id] = JSON.parse(msg);

        let picks = {}
        for (let socketId in professionPicks) {
            picks[names[socketId]] = {
                profession: professionPicks[socketId], 
                ready: readys.indexOf(socketId) >= 0
            };
        }
        io.emit('profession picked', JSON.stringify(picks))
    });

    socket.on('play as god', function () {
        for (let key in professionPicks) {
            if (professionPicks[key] === 'God') {
                io.to(socket.id).emit('role already taken', 'Only one god is supported');
                return;
            }
        }

        let index = readys.indexOf(socket.id);
        if (index > -1) {
            readys.splice(index, 1);
            io.to(socket.id).emit('unready');
        }

        professionPicks[socket.id] = 'God';

        let picks = {}
        for (let socketId in professionPicks) {
            picks[names[socketId]] = {
                profession: professionPicks[socketId], 
                ready: readys.indexOf(socketId) >= 0
            };
        }
        io.emit('profession picked', JSON.stringify(picks))
    });

    socket.on('ready', function(msg) {
        if (typeof professionPicks[socket.id] === 'undefined') {
            return;
        }

        readys.push(socket.id);
        
        if (readys.length === gameInstance.max_survivors + 1) {

            let hasGod = false;
            for (let i in professionPicks) {
                if (professionPicks[i] === "God") {
                    hasGod = true;
                }
            }

            if (!hasGod) {
                io.emit('role already taken', 'Someone has to pick God!');
                readys.splice(readys.indexOf(socket.id), 1);
                return;
            }

            for (let i in professionPicks) {
                if (professionPicks[i] == 'God') {
                    gameInstance.joinAsGod(i, names[i]);
                } else {
                    gameInstance.joinAsSurvivor(i, professionPicks[i], names[i]);
                }
            }
            enterGame();
        }

        let picks = {}
        for (let socketId in professionPicks) {
            picks[names[socketId]] = {
                profession: professionPicks[socketId], 
                ready: readys.indexOf(socketId) >= 0
            };
        }
        io.emit('profession picked', JSON.stringify(picks))
        io.to(socket.id).emit('ready');
    });

    socket.on('unready', function(msg) {
        readys.splice(readys.indexOf(socket.id), 1);
        let picks = {}
        for (let socketId in professionPicks) {
            picks[names[socketId]] = {
                profession: professionPicks[socketId], 
                ready: readys.indexOf(socketId) >= 0
            };
        }
        io.emit('profession picked', JSON.stringify(picks))
        io.to(socket.id).emit('unready');

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
let gameLoopInterval = null;

function game_start() {
    gameStartTime = Date.now();
    then = Date.now();

    gameLoopInterval = setInterval(gameLoop, 1000 / tick_rate);
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

    // Step and update objects
    physicsEngine.world.step(deltaTime * 0.001);
    Object.keys(gameInstance.objects).forEach(function (name) {
        if (typeof physicsEngine.obj[name] !== 'undefined') {
            gameInstance.objects[name].position = [+physicsEngine.obj[name].position.x.toFixed(3), +(physicsEngine.obj[name].position.y - gameInstance.objects[name].radius).toFixed(3), +physicsEngine.obj[name].position.z.toFixed(3)];
        }
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
        sound: gameInstance.sound,
        time: duration,
        toClean: gameInstance.toClean,
        debug: {looptime: elapse},
        progress: { curProgress: gameInstance.tower.curHealth, winProgress: gameInstance.tower.maxHealth }
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
    movementEvents[name] = 'stay';
    io.emit('Survivor Died', JSON.stringify({ name }));
}

function notifySurvivorRevived(name) {
    io.emit('Survivor Revived', JSON.stringify({ name }));
}


function endGame(survivorsWon) {
    clearInterval(gameLoopInterval);
    if (survivorsWon) {
        io.emit('end game', 'Survivor');
    } else {
        io.emit('end game', 'God');
    }
}
