const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    pingInterval: 10000,
    pingTimeout: 3000,
});
const path = require('path');
const game = require('./public/js/game.js');
const physics = require('./public/js/physics.js');

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

    socket.on('play as survivor', function () {
        if (!gameInstance.joinAsSurvivor(socket.id)) {
            io.to(socket.id).emit('role already taken', 'Only three survivors are supported');
        }
        else {
            if (gameInstance.checkEnoughPlayer()) {
                // Game begins, notify all participants to enter
                game_start();
                startTime = Date.now();
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

        gameInstance.decrementCoolDown(1/tick_rate);

        // Handle Movements
        if (typeof movementEvents[gameInstance.god.name] !== 'undefined') {
            if (movementEvents[gameInstance.god.name] === 'stay') {
                gameInstance.stay(gameInstance.god.name);
            } else {
                gameInstance.move(gameInstance.god.name, movementEvents[gameInstance.god.name]);

            }
            delete movementEvents[gameInstance.god.name];
        }
        gameInstance.survivors.forEach(function (survivor) {
            if (typeof movementEvents[survivor.name] !== 'undefined') {
                if (movementEvents[survivor.name] === 'stay') {
                    gameInstance.stay(survivor.name);
                } else {
                    gameInstance.move(survivor.name, movementEvents[survivor.name]);

                }
                delete movementEvents[survivor.name];
            }
        });

        // Handle jumps
        if (typeof jumpEvents[gameInstance.god.name] !== 'undefined') {
            gameInstance.jump(gameInstance.god.name);
            delete jumpEvents[gameInstance.god.name];
        }
        gameInstance.survivors.forEach(function (survivor) {
            if (typeof jumpEvents[survivor.name] !== 'undefined') {
                gameInstance.jump(survivor.name);
                delete jumpEvents[survivor.name];
            }
        });

        // Handle skill
        if (typeof skillEvents[gameInstance.god.name] !== 'undefined') {
            gameInstance.handleSkill(gameInstance.god.name, skillEvents[gameInstance.god.name]);
            delete skillEvents[gameInstance.god.name];
        }
        gameInstance.survivors.forEach(function (survivor) {
            if (typeof skillEvents[survivor.name] !== 'undefined') {
                gameInstance.handleSkill(survivor.name, skillEvents[survivor.name]);
                delete skillEvents[survivor.name];
            }
        });

        // Handle attacks
        if (typeof shootEvents[gameInstance.god.name] !== 'undefined') {
            gameInstance.shoot(gameInstance.god.name, shootEvents[gameInstance.god.name]);
            delete shootEvents[gameInstance.god.name];
        }
        gameInstance.survivors.forEach(function (survivor) {
            if (typeof shootEvents[survivor.name] !== 'undefined') {
                gameInstance.shoot(survivor.name);
                delete shootEvents[survivor.name];
            }
        });
        if (typeof meleeEvents[gameInstance.god.name] !== 'undefined') {
            gameInstance.melee(gameInstance.god.name, meleeEvents[gameInstance.god.name]);
            delete meleeEvents[gameInstance.god.name];
        }
        gameInstance.survivors.forEach(function (survivor) {
            if (typeof meleeEvents[survivor.name] !== 'undefined') {
                gameInstance.melee(survivor.name);
                delete meleeEvents[survivor.name];
            }
        });

        // Step and update objects
        gameInstance.beforeStep();
        physicsEngine.world.step(deltaTime * 0.001);
        gameInstance.afterStep();

        Object.keys(physicsEngine.obj).forEach(function (name) {
            gameInstance.objects[name].position = [physicsEngine.obj[name].position.x, physicsEngine.obj[name].position.y - gameInstance.objects[name].radius, physicsEngine.obj[name].position.z];
        });

        const broadcast_status = JSON.stringify(gameInstance.objects);
        
        io.emit('game_status', broadcast_status);
        let end = Date.now();
        elapse = end - start;
        duration = end - gameStartTime;
        io.emit('tiktok', JSON.stringify(duration));
        
        if (elapse > 1000 / tick_rate) {
            console.error('Warning: loop time ' + elapse.toString() + 'ms exceeds tick rate of ' + tick_rate.toString());
        }
    }, 1000 / tick_rate);
}