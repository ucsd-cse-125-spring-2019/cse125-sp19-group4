import getWrappedGL from '/public/util/debug.js';
import readStringFrom from '/public/util/io.js';
import Camera from '/public/js/camera.js'
import * as UI from '/public/js/UI.js'

const UIdebug = true;

const camera = new Camera();
let spectator_mode = false;

let uid = '';
let left_cursor_down = false;
let isGod = false;
let prev_direction = glMatrix.vec3.create();

const FACE_mat = glMatrix.mat4.create();
glMatrix.mat4.fromYRotation(FACE_mat, glMatrix.glMatrix.toRadian(180));
const FACE = [0.0, 0.0, -1.0];
const NEG_FACE = glMatrix.vec3.create();
glMatrix.vec3.negate(NEG_FACE, FACE);

const defaultCursor = "public/images/mouse/normal.cur";
const noCursor = "public/images/mouse/cancel.png";
let cursor_icon = '';

let player = {};

const player_profession = {};
const player_alive = {};
const player_die_index = {};

const player_texture_files = {
    'Archer': '/public/model/player/archerTexture.png',
    'Fighter': '/public/model/player/fighterTexture.png',
    'Healer': '/public/model/player/healerTexture.png',
}

const objects = {};
const cast_models = [];

const texture_counter = { i: 0 };

const mouse_pos = { x: 0, y: 0 };

const cursor = glMatrix.vec3.create();

const positions = {}
const directions = {}
const skillCursors = {}

const model_ref = {};

const x_neg_90 = glMatrix.mat4.fromXRotation(glMatrix.mat4.create(), -Math.PI / 2);
const y_pos_90 = glMatrix.mat4.fromYRotation(glMatrix.mat4.create(), Math.PI / 2);
const y_neg_90 = glMatrix.mat4.fromYRotation(glMatrix.mat4.create(), -Math.PI / 2);
const z_neg_90 = glMatrix.mat4.fromZRotation(glMatrix.mat4.create(), -Math.PI / 2);

const transform_ref = {
    '': glMatrix.mat4.create(),
    // environment
    'terrain': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [10, 10, 10]),
    'tower': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [2, 1.5, 2]),
    'tree': glMatrix.mat4.create(),

    // player
    'player_standing': glMatrix.mat4.create(),
    'player_running': glMatrix.mat4.clone(x_neg_90),
    'player_die': glMatrix.mat4.clone(x_neg_90),

    // monster
    'slime': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [2, 2, 2]),
    'cactus': glMatrix.mat4.clone(y_neg_90),
    'spike': glMatrix.mat4.multiply(glMatrix.mat4.create(), y_pos_90, x_neg_90),

    // item
    // 'boots': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [0.01, 0.01, 0.01]),
    // 'swords': glMatrix.mat4.clone(z_neg_90),
    // 'shields': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [0.08, 0.08, 0.08]),
    // 'hearts': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [1.2, 1, 1]),
    // 'daggers': glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), [0, 5, 0]),
    'boots': glMatrix.mat4.clone(x_neg_90),
    'swords': glMatrix.mat4.clone(x_neg_90),
    'shields': glMatrix.mat4.clone(x_neg_90),
    'hearts': glMatrix.mat4.clone(x_neg_90),
    'daggers': glMatrix.mat4.clone(x_neg_90),

    // projectile
    'bullet': glMatrix.mat4.create(),
    'fireball': glMatrix.mat4.create(),

    // effect
    'shieldWall': glMatrix.mat4.clone(x_neg_90),
    'taunted': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [3, 3, 3]),
    'ring_green': glMatrix.mat4.create(),
    'ring_red': glMatrix.mat4.create(),
    'ring_yellow': glMatrix.mat4.create(),
};

// ============================ Sound ================================

const bgm = new Audio('/public/audio/Hopes_and_Dreams.mp3');
bgm.volume = 0.5;
if (typeof bgm.loop == 'boolean') {
    bgm.loop = true;
}
else {
    bgm.addEventListener('ended', function () {
        this.currentTime = 0;
        this.play();
    }, false);
}

const sounds = {
    'sprint': '/public/audio/sprint.mp3',
    'moan': '/public/audio/moan.mp3',
    'punch': '/public/audio/punch.mp3',
    'shatter': '/public/audio/shatter.mp3',
    'shoot': '/public/audio/shoot.mp3',
    'taunt': '/public/audio/taunt.mp3',
    'shield': '/public/audio/shield.mp3',
    'fireball': '/public/audio/fireball.mp3',
    'boost': '/public/audio/boost.mp3',
    'buff': '/public/audio/buff.mp3',
    'heal': '/public/audio/heal.mp3',
    'resurrect': '/public/audio/resurrect.mp3',
    'cut': '/public/audio/cut.mp3',
}

// ============================ Network IO ================================

const socket = io();

socket.on('chat message', function (msg) {
    openChatBox();
    $('#messages').append($('<li>').text(msg));
    if (!messaging) {
        chatBoxFade();
    }
});

socket.on('notification', function (msg) {
    const data = JSON.parse(msg);
    const { message, type } = data;
    UI.updateNotification(message, type);
});

$('.game-area').html($('#intro-screen-template').html());

let roleTimeout;
socket.on('role already taken', function (msg) {
    clearTimeout(roleTimeout);
    $('.talktext').html(msg);
    $('#reminder').css('opacity', '1');
    roleTimeout = setTimeout(function () {
        $('#reminder').css('opacity', '0');
    }, 2000);
});

let nameTimeout;
socket.on('name already taken', function (msg) {
    clearTimeout(nameTimeout);
    $('#nameTaken').css('opacity', '1');
    nameTimeout = setTimeout(function () {
        $('#nameTaken').css('opacity', '0');
    }, 2000);
});

socket.on('enter lobby', function() {
    let nameScreen = document.getElementById("nameScreen");
    let menu = document.getElementById('menu');
    menu.style["pointer-events"] = "auto";
    $('#nameScreen').animate({opacity: 0}, 2000);
    setTimeout(function() {
        $('#nameScreen').css('display', 'none')
    }, 2000);
});

const professions = ['Archer', 'Fighter', 'Healer', 'God'];
socket.on('profession picked', function(msg) {
    for (let i in professions) {
        let profession = professions[i];
        let ul = document.getElementById(profession + "Pick");
        while( ul.firstChild ){
            ul.removeChild( ul.firstChild );
        }
    }

    let picks = JSON.parse(msg);
    for (let name in picks) {
        let { profession, ready } = picks[name];
        let ul = document.getElementById(profession + "Pick");
        let nameDiv = document.createElement('div');
        nameDiv.style = "color: black; white-space: nowrap"
        let string = name;
        if (ready) {
            string += '<span style="color: green; display: inline-block"> ✓'
        }
        nameDiv.innerHTML = string;
        ul.appendChild(nameDiv);
    }
});

let ready = false;
socket.on('ready', function() {
    ready = true;
    $('#readyButton').html('unready');
})

socket.on('unready', function() {
    ready = false;
    $('#readyButton').html('ready');
})

socket.on('enter game', function (msg) {
    console.log('enter game');

    setCursor(defaultCursor);
    UIInitialize();
    const data = JSON.parse(msg);
    const players = data.players;
    const objs = data.objects;

    uid = players[socket.id].name;
    for (let key in players) {
        player_alive[players[key].name] = true;
        if (typeof players[key].profession !== 'undefined') {
            player_profession[players[key].name] = players[key].profession;
        }
    }
    player = players[socket.id];
    console.log("my name is", uid);

    // get the skill cursor
    for (let key in player.skills) {
        skillCursors[key] = player.skills[key].cursorPath
    }

    UI.InitializeStatus(player.status);
    UI.InitializeSkills(player.skills);
    UI.InitializeTeammates(players);
    if (uid !== "God") {
        UI.InitializeVault(player.items);
        UI.updateItems(player.items);
    } else {
        isGod = true;
        document.getElementById('vault').style.display = "none"
    }

    // Initialize models for all objects
    Object.keys(objs).forEach(function (name) {
        const obj = objs[name];
        objects[name] = { 'm': obj.model, 't': glMatrix.mat4.clone(transform_ref[obj.model]) };
        if (typeof player_profession[name] !== 'undefined') {
            objects[name].profession = player_profession[name];
        }
        directions[name] = obj.direction;
        positions[name] = obj.position;
    });

    main();
});

socket.on('wait for game begin', function (msg) {
    $('#loadingBox').css('display', 'block');
    $('#menu').css('opacity', '0.1');
    $('#gameName').css('opacity', '0');
    $('#lobbyUl').animate('opacity', '0');
    $('#GodButton').prop('disabled', true);
    $('#SurvivorButton').prop('disabled', true);

    const { playerCount, statusString } = JSON.parse(msg);
    for (let i in playerCount) {
        $('#' + i).html(playerCount[i]);
    }
    $('#numStatus').html(statusString);
});

socket.on('Survivor Died', function (msg) {
    const data = JSON.parse(msg);
    const { name } = data;
    if (name === uid) {
        $('.game-area').css('filter', 'grayscale(70%)');
        spectator_mode = true;
        casting = -1;
        delete objects['casting'];
        setCursor(defaultCursor);
        UI.switchCasting(casting, true);
    } else {
        document.getElementById(name + "Icon").style.filter = "grayscale(70%)";
    }
});

socket.on('Survivor Revived', function (msg) {
    const data = JSON.parse(msg);
    const { name } = data;

    player_alive[name] = true;

    if (name === uid) {
        $('.game-area').css('filter', 'none')
        spectator_mode = false;
        camera.setPosition(positions[name], true);
    } else {
        document.getElementById(name + "Icon").style.filter = "none";
    }
});

socket.on('end game', function (msg) {
    // $('.game-area').html($('#endgame-template').html());
    // document.getElementById('endgame-message').innerHTML = msg;
    $('#statusBar').css("display", "none");
    $('#skillBarDiv').css("display", "none");
    $('#teammatesDiv').css("display", "none");
    $('#progressDiv').css("display", "none");
    $('#vault').css("display", "none");
    let endGameMessageDiv = document.createElement('div');
    let endGameMessage = document.createElement('span');
    endGameMessage.id = "endGameMessage";
    endGameMessageDiv.appendChild(endGameMessage);

    let gameArea = document.getElementById('game-area')
    gameArea.style.transition = "3s"
    let godWon = msg === "God";
    let divStyle =  "position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); height: 140px; width: 510px;" +
                       "clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);"
    let textStyle = "position: absolute; top: 100%; font-size: 70pt;";
    endGameMessage.style = textStyle;

    if ((isGod && godWon) || (!isGod && !godWon)) {
        endGameMessageDiv.style = divStyle
        endGameMessage.innerHTML = "YOU WON!"
        gameArea.style.filter = "brightness(1.4)"
    } else {
        endGameMessageDiv.style = divStyle + "color: red"
        endGameMessage.innerHTML = "YOU LOST!"
        gameArea.style.filter = "grayscale(70%)"
    }
    gameArea.appendChild(endGameMessageDiv);
    $('#endGameMessage').animate({ top: "0%"}, 3000);
});

$('#GodButton').click(function () {
    socket.emit("play as god");
});

$('#FighterButton').click(function () {
    socket.emit("play as survivor", JSON.stringify("Fighter"));
});

$('#HealerButton').click(function () {
    socket.emit("play as survivor", JSON.stringify("Healer"));
});

$('#ArcherButton').click(function () {
    socket.emit("play as survivor", JSON.stringify("Archer"));
});

$('#nameButton').click(function () {
    if (document.getElementById('nameInput').value.length > 0) {
        socket.emit("name submitted", document.getElementById('nameInput').value);
    }
});

$('#readyButton').click(function () {
    if (ready) {
        socket.emit("unready");
    }
    else {
        socket.emit("ready");
    }
});

socket.on('game_status', function (msg) {
    const start = Date.now();
    const status = JSON.parse(msg);

    const data = status.data;
    const sound = status.sound;
    if (typeof sound !== 'undefined') {
        sound.forEach(s => {
            if (typeof sounds[s] !== 'undefined') {
                new Audio(sounds[s]).play();
            }
        });
    }
    
    const player = data[uid];
    if (!spectator_mode && typeof player !== 'undefined') {
        if (typeof player.position !== 'undefined') {
            // debugger
            $('#x').html(player.position[0]);
            $('#y').html(player.position[1]);
            $('#z').html(player.position[2]);
            camera.setPosition(player.position);
        }
        // Update UI
        if (typeof player.status !== 'undefined') {
            UI.healthUpdate(player.status);
            UI.statusUpdate(player.status);
        }
        if (typeof player.buff !== 'undefined') {
            UI.buffUpdate(player.buff);
        }
        if (typeof player.tempBuff !== 'undefined') {
            UI.tempBuffUpdate(player.tempBuff);
        }
        if (typeof player.skills !== 'undefined') {
            UI.coolDownUpdate(player.skills);
        }
        if (typeof status.progess !== 'undefine') {
            UI.updateProgressBar(status.progress)
        }

        if ('items' in player) {
            UI.updateItems(player.items)
        }
    }
    UI.teammatesUpdate(data);

    Object.keys(data).forEach(function (name) {
        const obj = data[name];
        let transform = false;
        let direction = directions[name];
        if ('direction' in obj) {
            direction = obj.direction;
            directions[name] = obj.direction;
            transform = true;
        }
        let position = positions[name];
        if ('position' in obj) {
            position = obj.position;
            positions[name] = obj.position
            transform = true;
        }

        if (typeof objects[name] === 'undefined') { //TODO move this to other event
            objects[name] = { 'm': obj.model, 't': glMatrix.mat4.clone(transform_ref[obj.model]) };
        }

        if ('model' in obj) {
            objects[name].m = obj['model'];
            transform = true;
        }

        if ('size' in obj) {
            objects[name].size = obj.size;
        }

        if (transform) {
            // update face
            const dot = glMatrix.vec3.dot(direction, FACE);
            const axis = glMatrix.vec3.create();
            if (glMatrix.vec3.equals(direction, FACE)) {
                axis[1] = 1.0;
            } else if (glMatrix.vec3.equals(direction, NEG_FACE)) {
                axis[1] = -1.0;
            } else {
                glMatrix.vec3.cross(axis, FACE, direction);
            }
            const angle = Math.acos(dot);
            const rotation = glMatrix.mat4.create();
            glMatrix.mat4.rotate(rotation, FACE_mat, angle, axis);
            // update position
            const translation = glMatrix.mat4.create();
            glMatrix.mat4.fromTranslation(translation, position);
            const transformation = glMatrix.mat4.create();
            glMatrix.mat4.multiply(transformation, translation, rotation);
            let t = glMatrix.mat4.clone(transform_ref[objects[name].m]);
            if (typeof objects[name].size !== 'undefined') {
                glMatrix.mat4.scale(t, t, [objects[name].size, objects[name].size, objects[name].size]);
            }
            glMatrix.mat4.multiply(objects[name].t, transformation, t);
        }
    });

    status.toClean.forEach(function (name) {
        if (typeof objects[name] === 'undefined') {
            console.error(name, 'not in objects');
        } else {
            if (objects[name].m == 'slime' || objects[name].m == 'cactus' || objects[name].m == 'spike') {
                new Audio('/public/audio/moan.mp3').play();
            }
            delete objects[name];
        }
    });
    const end = Date.now();
    $('#processing').html(end - start);
    $('#bytes').html(msg.length);
    $('#server').html(status.debug.looptime);

    UI.timerUpdate(status.time);

});

socket.on('pong', (latency) => {
    $('#ping').html(latency);
});


// ====================================Canvas===================================

/**
 * Start here
 */
function main() {
    bgm.play();

    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#glCanvas");
    // set the canvas resolution
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener("mousedown", mouseDown, false);
    window.addEventListener("contextmenu", contextmenu, false);
    window.addEventListener("mouseup", mouseUp, false);
    // canvas.addEventListener("mouseout", mouseUp, false);
    window.addEventListener("mousemove", mouseMove, false);
    window.addEventListener("wheel", zoom, { passive: false });

    window.addEventListener('keyup', function (event) { Key.onKeyup(event); }, false);
    window.addEventListener('keydown', function (event) { Key.onKeydown(event); }, false);

    /** @type {WebGLRenderingContext} */
    const gl = getWrappedGL(canvas);

    // If we don't have a GL context, give up now
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Initialize a shader program; this is where all the lighting
    // for the vertices and so forth is established.
    const vsFilename = '/public/shader/demo.vert';
    const fsFilename = '/public/shader/demo.frag';
    const shaderProgram = initShaderProgram(gl, vsFilename, fsFilename);

    // Collect all the info needed to use the shader program.
    // Look up which attributes our shader program is using
    // for aVertexPosition, aVevrtexColor and also
    // look up uniform locations.
    const programInfo = {
        program: shaderProgram,
        vsname: vsFilename,
        fsname: fsFilename,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            normal: gl.getAttribLocation(shaderProgram, 'normal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            transformMatrix: gl.getUniformLocation(shaderProgram, 'uTransformMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            ambientColor: gl.getUniformLocation(shaderProgram, "uAmbientColor"),
            diffuseColor: gl.getUniformLocation(shaderProgram, "uDiffuseColor"),
            specularColor: gl.getUniformLocation(shaderProgram, "uSpecularColor"),
            shininess: gl.getUniformLocation(shaderProgram, "uShininess"),
            alpha: gl.getUniformLocation(shaderProgram, "uAlpha"),
            viewPosition: gl.getUniformLocation(shaderProgram, "ViewPosition"),
        },
    };
    // Tell WebGL to use our program when drawing
    gl.useProgram(shaderProgram);

    // environment
    // model_ref['terrain'] = new OBJObject(gl, "terrain", "/public/model/environment/terrainPlane.obj", "", false, texture_counter, programInfo, [255, 229, 165]);
    model_ref['terrain'] = new OBJObject(gl, "terrain", "/public/model/environment/terrainPlane.obj", "/public/model/environment/terrainPlane.mtl", true, texture_counter, programInfo);
    model_ref['tower'] = new OBJObject(gl, "terrain", "/public/model/environment/tower.obj", "/public/model/environment/tower.mtl", true, texture_counter, programInfo);
    model_ref['tree'] = new OBJObject(gl, "tree", "/public/model/environment/treeGreen.obj", "/public/model/environment/treeGreen.mtl", true, texture_counter, programInfo);

    // player
    model_ref['player_standing'] = new OBJObject(gl, "player", "/public/model/player/player_standing.obj", "/public/model/player/player_standing.mtl", true, texture_counter, programInfo, [0, 0, 0], 1.0, player_texture_files);
    model_ref['player_running'] = new Animation(gl, "/public/model/player/player_running.json", programInfo, texture_counter, player_texture_files);
    model_ref['player_running'].addInstance(gl);
    model_ref['player_die'] = new Animation(gl, "/public/model/player/player_die.json", programInfo, texture_counter, player_texture_files);
    let i = 0;
    for (let key in player_alive) {
        model_ref['player_die'].addInstance(gl);
        player_die_index[key] = i++;
    }

    // monster
    model_ref['slime'] = new OBJObject(gl, "slime", "/public/model/monster/slime.obj", "/public/model/monster/slime.mtl", true, texture_counter, programInfo);
    model_ref['cactus'] = new OBJObject(gl, "cactus", "/public/model/monster/cactus.obj", "/public/model/monster/cactus.mtl", true, texture_counter, programInfo);
    // model_ref['spike'] = new OBJObject(gl, "spike", "/public/model/monster/spike.obj", "/public/model/monster/spike.mtl", true, texture_counter, programInfo);
    model_ref['spike'] = new Animation(gl, "/public/model/monster/spike.json", programInfo, texture_counter);
    model_ref['spike'].addInstance(gl);

    // item
    // model_ref['boots'] = new OBJObject(gl, "boots", "/public/model/item/boot.obj", "", false, texture_counter, programInfo, [0, 255, 255]);
    // model_ref['swords'] = new OBJObject(gl, "swords", "/public/model/item/SwordCartoonLowPoly.obj", "", false, texture_counter, programInfo, [100, 100, 100]);
    // model_ref['shields'] = new OBJObject(gl, "shields", "/public/model/item/Shield_obj.obj", "", false, texture_counter, programInfo, [255, 155, 56]);
    // model_ref['hearts'] = new OBJObject(gl, "hearts", "/public/model/item/heart.obj", "", false, texture_counter, programInfo, [255, 0, 0]);
    // model_ref['daggers'] = new OBJObject(gl, "daggers", "/public/model/item/Dagger.obj", "", false, texture_counter, programInfo, [238, 55, 255]);

    model_ref['boots'] = new Animation(gl, "/public/model/item/boot.json", programInfo, texture_counter);
    model_ref['boots'].addInstance(gl);
    model_ref['swords'] = new Animation(gl, "/public/model/item/sword.json", programInfo, texture_counter);
    model_ref['swords'].addInstance(gl);
    model_ref['shields'] = new Animation(gl, "/public/model/item/shield.json", programInfo, texture_counter);
    model_ref['shields'].addInstance(gl);
    model_ref['hearts'] = new Animation(gl, "/public/model/item/heart.json", programInfo, texture_counter);
    model_ref['hearts'].addInstance(gl);
    model_ref['daggers'] = new Animation(gl, "/public/model/item/dagger.json", programInfo, texture_counter);
    model_ref['daggers'].addInstance(gl);

    // projectile
    model_ref['bullet'] = new OBJObject(gl, "bullet", "/public/model/projectile/sphere.obj", "", false, texture_counter, programInfo);
    model_ref['fireball'] = new OBJObject(gl, "bullet", "/public/model/projectile/flameBullet.obj", "/public/model/projectile/flameBullet.mtl", true, texture_counter, programInfo);

    //effect
    model_ref['shieldWall'] = new Animation(gl, "/public/model/effect/shield.json", programInfo, texture_counter);
    model_ref['shieldWall'].addInstance(gl);
    model_ref['taunted'] = new OBJObject(gl, "taunted", "/public/model/effect/taunted.obj", "/public/model/effect/taunted.mtl", true, texture_counter, programInfo);
    model_ref['ring_green'] = new OBJObject(gl, "ring_green", "/public/model/effect/ringWithFilling.obj", "", false, texture_counter, programInfo, [0, 255, 0], 0.2);
    model_ref['ring_red'] = new OBJObject(gl, "ring_red", "/public/model/effect/ringWithFilling.obj", "", false, texture_counter, programInfo, [255, 0, 0], 0.2);
    model_ref['ring_yellow'] = new OBJObject(gl, "ring_yellow", "/public/model/effect/ringWithFilling.obj", "", false, texture_counter, programInfo, [244, 215, 66], 0.2);


    objects['terrain'] = { m: 'terrain', t: glMatrix.mat4.clone(transform_ref['terrain']) };
    
    cast_models[0] = { m: 'slime', t: glMatrix.mat4.clone(transform_ref['slime']) };
    cast_models[1] = { m: 'cactus', t: glMatrix.mat4.clone(transform_ref['cactus']) };
    cast_models[2] = { m: 'spike', t: glMatrix.mat4.clone(transform_ref['spike']) };
    cast_models[3] = { m: 'tree', t: glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [4, 4, 4]) };
    let then = 0;
    // Draw the scene repeatedly
    function render(now) {
        const deltaTime = (now - then) / 1000;
        $('#fps').html(Math.floor(1 / deltaTime));
        $('#render').html(Math.ceil(deltaTime * 1000));

        then = now;

        let start = Date.now();
        model_ref['player_running'].updateJoints(deltaTime, 0, true);
        model_ref['spike'].updateJoints(deltaTime, 0, true);
        model_ref['shieldWall'].updateJoints(deltaTime, 0, true);
        model_ref['boots'].updateJoints(deltaTime, 0, true);
        model_ref['shields'].updateJoints(deltaTime, 0, true);
        model_ref['swords'].updateJoints(deltaTime, 0, true);
        model_ref['hearts'].updateJoints(deltaTime, 0, true);
        model_ref['daggers'].updateJoints(deltaTime, 0, true);

        for (let name in player_alive) {
            if (!player_alive[name]) {
                model_ref['player_die'].updateJoints(deltaTime, player_die_index[name], false);
            } else if (objects[name].m === 'player_die') {
                model_ref['player_die'].resetTime(player_die_index[name]);
                console.log(name, 'reset');
                player_alive[name] = false;
            }
        }

        let end = Date.now();
        $('#animation').html(end - start);

        // Camera Rotation
        if (Key.isDown('ROTLEFT') && Key.isDown('ROTRIGHT')) {
            // do nothing
        } else if (Key.isDown('ROTLEFT')) {
            camera.rotateLeft(deltaTime);
        } else if (Key.isDown('ROTRIGHT')) {
            camera.rotateRight(deltaTime);
        }

        if (spectator_mode) {
            if (Key.isDown('UP')) {
                camera.moveFoward(deltaTime);
            }
            if (Key.isDown('DOWN')) {
                camera.moveBackward(deltaTime);
            }
            if (Key.isDown('LEFT')) {
                camera.moveLeft(deltaTime);
            }
            if (Key.isDown('RIGHT')) {
                camera.moveRight(deltaTime);
            }
        } else {
            // Jump, god's jump disabled
            if (Key.isDown('JUMP') && !isGod) {
                delete Key._pressed['JUMP'];
                Key.jumped = true;
                socket.emit('jump');
            }

            // Movement
            let direction = glMatrix.vec3.create();

            if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
                // direction = 'stay';
            } else if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('LEFT')) {
                glMatrix.vec3.negate(direction, camera.Right);
            } else if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('RIGHT')) {
                direction = camera.Right;
            } else if (Key.isDown('UP') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
                direction = camera.Foward;
            } else if (Key.isDown('DOWN') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
                glMatrix.vec3.negate(direction, camera.Foward);
            } else if (Key.isDown('UP') && Key.isDown('DOWN') || Key.isDown('LEFT') && Key.isDown('RIGHT')) {
                // direction = 'stay';
            } else if (Key.isDown('UP') && Key.isDown('RIGHT')) {
                glMatrix.vec3.add(direction, camera.Foward, camera.Right);
                glMatrix.vec3.normalize(direction, direction);
            } else if (Key.isDown('DOWN') && Key.isDown('RIGHT')) {
                glMatrix.vec3.subtract(direction, camera.Right, camera.Foward);
                glMatrix.vec3.normalize(direction, direction);
            } else if (Key.isDown('DOWN') && Key.isDown('LEFT')) {
                glMatrix.vec3.add(direction, camera.Foward, camera.Right);
                glMatrix.vec3.negate(direction, direction);
                glMatrix.vec3.normalize(direction, direction);
            } else if (Key.isDown('UP') && Key.isDown('LEFT')) {
                glMatrix.vec3.subtract(direction, camera.Foward, camera.Right);
                glMatrix.vec3.normalize(direction, direction);
            } else if (Key.isDown('UP')) {
                direction = camera.Foward;
            } else if (Key.isDown('DOWN')) {
                glMatrix.vec3.negate(direction, camera.Foward);
            } else if (Key.isDown('LEFT')) {
                glMatrix.vec3.negate(direction, camera.Right);
            } else if (Key.isDown('RIGHT')) {
                direction = camera.Right;
            } else {
                // direction = 'stay';
            }

            if (!glMatrix.vec3.equals(prev_direction, direction)) {
                if (glMatrix.vec3.equals(direction, glMatrix.vec3.create())) {
                    socket.emit('movement', JSON.stringify('stay'));
                } else {
                    socket.emit('movement', JSON.stringify(direction));
                }
                prev_direction = glMatrix.vec3.clone(direction);
            }

            // Skill
            if (casting >= 0) {

                const normal = [0.0, 1.0, 0.0];
                const center = [0.0, 0.0, 0.0];

                const ray = camera.getRay(mouse_pos.x, mouse_pos.y);
                const denominator = glMatrix.vec3.dot(normal, ray.dir);
                if (Math.abs(denominator) > 0.00001) {
                    const difference = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(difference, center, ray.pos);
                    const t = glMatrix.vec3.dot(difference, normal) / denominator;
                    glMatrix.vec3.scaleAndAdd(cursor, ray.pos, ray.dir, t);
                }


                if (isGod) {
                    if (typeof objects['casting'] === 'undefined' || objects['casting'].m != cast_models[casting].m) {
                        objects['casting'] = { m: cast_models[casting].m, t: glMatrix.mat4.clone(cast_models[casting].t) };
                    }
                    const translation = glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), cursor);
                    if (typeof objects['casting'] !== 'undefined') {
                        glMatrix.mat4.multiply(objects['casting'].t, translation, cast_models[casting].t);
                    }
                } else if (casting == 0 && left_cursor_down) {
                    const skillsParams = { skillNum: casting, position: cursor };
                    socket.emit('skill', JSON.stringify(skillsParams));
                }

                if (typeof player.skills[casting].range) {
                    const distance = glMatrix.vec3.distance(positions[uid], cursor);
                    if (distance > player.skills[casting].range && cursor_icon != noCursor) {
                        console.log('setting no');
                        
                        setCursor(noCursor);
                    } else if (distance <= player.skills[casting].range && cursor_icon != skillCursors[casting]) {
                        console.log('setting skill');
                        setCursor(skillCursors[casting]);
                    }
                }
            }
        }
        
        start = Date.now();
        $('#event').html(start - end);

        drawScene(gl, programInfo, objects, camera);
        end = Date.now();
        $('#draw').html(end - start);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}


/**
 * Draw the scene.
 * @param  {WebGLRenderingContext} gl
 * @param  {Object} programInfo
 * @param  {Object} objects
 * transformation
 * @param  {Camera} camera
 */
function drawScene(gl, programInfo, objects, camera) {
    gl.clearColor(0.0, 0.3, 0.3, 1.0);  // Clear to black, fully opaque
    // gl.clearColor(0.68, 1.0, 0.18, 0.4);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = camera.getViewMatrix();
    const projectionMatrix = camera.getProjectionMatrix();
    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    gl.uniform3fv(programInfo.uniformLocations.viewPosition, camera.Position);


    const to_render = {};
    const timer = {};
    let objects_keys = Object.keys(objects);
    for (let i = 0; i < objects_keys.length; i++) {
        const obj = objects[objects_keys[i]];

        if (obj.m === '') {
            continue;
        }
        if (typeof to_render[obj.m] === 'undefined') {
            to_render[obj.m] = [];
            to_render[obj.m].push({});
            timer[obj.m] = 0;
        }
        if (typeof obj.profession !== 'undefined') {
            to_render[obj.m][0][player_die_index[objects_keys[i]]] = obj.profession;
        }
        to_render[obj.m].push(obj.t);
    }

    let to_render_keys = Object.keys(to_render);

    for (let i = 0, len = to_render_keys.length; i < len; i++) {
        const m = to_render_keys[i];
        const start = Date.now();
        if (model_ref[m].constructor.name == "Animation") {
            model_ref[m].render(gl, to_render[m], to_render[m][0]);
        } else {
            model_ref[m].render(gl, to_render[m]);
        }
        const end = Date.now();
        timer[to_render_keys[i]] = end - start;
    }
    // console.log(timer);
}


/**
 * Initialize a shader program, so WebGL knows how to draw our data
 * @param    {WebGLRenderingContext} gl
 * @param    {String} vsFilename
 * @param    {String} fsFilename
 */
function initShaderProgram(gl, vsFilename, fsFilename) {
    const vsSource = readStringFrom(vsFilename);
    const fsSource = readStringFrom(fsFilename);
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}


/**
 * creates a shader of the given type, uploads the source and compiles it.
 * @param  {WebGLRenderingContext} gl
 * @param  {number} type
 * @param  {String} source
 */
function loadShader(gl, type, source) {
    /** @type {WebGLShader} */
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/*================= Mouse events ======================*/
const contextmenu = function (e) {
    e.preventDefault();
}

const mouseDown = function (e) {
    e.preventDefault();
    switch (e.which) {
        case 1:
            // left click
            left_cursor_down = true;
            if (casting >= 0) {
                const skillsParams = { skillNum: casting, position: cursor };
                socket.emit('skill', JSON.stringify(skillsParams));
            }

            break;
        case 3:
            // right click
            if (casting >= 0) {
                casting = -1;
                delete objects['casting'];
                setCursor(defaultCursor);
                UI.switchCasting(casting, true);
            }
            break;
        default:
            break;
    }
    return false;
};

const mouseUp = function (e) {
    left_cursor_down = false;
}

const mouseMove = function (e) {
    mouse_pos.x = e.pageX;
    mouse_pos.y = e.pageY;
};

const zoom = function (e) {
    e.preventDefault();
    if (e.deltaY > 0) {
        camera.zoomOut(isGod || spectator_mode);
    } else if (e.deltaY < 0) {
        camera.zoomIn();
    }
}

/*================= Keyboard events ======================*/

const Key = {
    _pressed: {},

    jumped: false,

    cmd: {
        32: 'JUMP',         // SPACE
        37: 'LEFT',         // left arrow
        38: 'UP',           // up arrow
        39: 'RIGHT',        // right arrow
        40: 'DOWN',         // down arrow
        65: 'LEFT',         // A
        68: 'RIGHT',        // D
        69: 'ROTRIGHT',     // E
        81: 'ROTLEFT',      // Q
        83: 'DOWN',         // S
        87: 'UP',           // W
    },

    isDown: function (command) {
        return this._pressed[command];
    },

    onKeydown: function (event) {
        if (messaging) {
            if (event.keyCode == 27) {
                // ESC, close chat box
                messaging = false;
                $('#messageInput').prop("disabled", true);
                $('#messageForm').css("display", "none");
                chatBoxFade();
            } else if (event.keyCode == 13) {
                // When the chat input is up, if user hit enter when the input box is empty, close input box
                if ($('#messageInput').val() == '') {
                    messaging = false;
                    $('#messageInput').prop("disabled", true);
                    $('#messageForm').css("display", "none");
                    chatBoxFade();
                } else {
                    $('#messageInput').submit; // clear message
                }
            }
            return;
        }

        // open up chatting and lock other key events
        if (event.keyCode == 13) {
            messaging = true;
            openChatBox();
            $('#messageForm').css("display", "block");
            $('#messageInput').prop("disabled", false);
            $('#messageInput').focus();
        } else if (!spectator_mode && event.keyCode == 32 && this.jumped) {
            // do nothing
        } else if (!spectator_mode && event.keyCode >= 49 && event.keyCode <= 57) { //key 1 - 9, skills
            handleSkill(uid, event.keyCode - 49);
        } else if (event.keyCode in this.cmd) {
            this._pressed[this.cmd[event.keyCode]] = true;
        }
    },

    onKeyup: function (event) {
        if (event.keyCode in this.cmd) {
            delete this._pressed[this.cmd[event.keyCode]];
        }

        if (event.keyCode == 32) {
            this.jumped = false;
        }
    }
};


/*===================================UI======================================*/
const closeMessageCountDown = 3000;     // 3 sec before the chatbox fades away
let fadeTimer;
let messaging = false;

function UIInitialize() {

    $('.game-area').html($('#ingame-template').html());
    $('#messageForm').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        if ($('#messageInput').val() != "") {
            socket.emit('chat message', $('#messageInput').val());
            $('#messageInput').val('');
            $("#messages").animate({ scrollTop: $('#messages').prop("scrollHeight") }, 1);
            return false;
        }
    });
    setCursor(defaultCursor);
}

function openChatBox() {
    clearTimeout(fadeTimer);
    $('#messages').animate({ opacity: 1 }, 50);
}

function chatBoxFade() {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
        $("#messages").animate({ opacity: 0 }, 1000);
    }, closeMessageCountDown);
}

function setCursor(url) {
    if (url == "/public/images/mouse/aim.png") {
        $('.game-area').css('cursor', 'url(' + url + ') 25 25, auto');
    } else if (url == "/public/images/mouse/fireball.png") {
        $('.game-area').css('cursor', 'url(' + url + ') 24 24, auto');
    } else if (url == "/public/images/mouse/axe.png") {
        $('.game-area').css('cursor', 'url(' + url + ') 0 24, auto');
    } else if (url == "/public/images/mouse/halo.png") {
        $('.game-area').css('cursor', 'url(' + url + ') 32 32, auto');
    } else {
        $('.game-area').css('cursor', 'url(' + url + '), auto');
    }
    cursor_icon = url;
}
/*================================End of UI===================================*/

/*================================= Skill ===================================*/
let casting = -1;

function handleSkill(uid, skillNum) {
    const skill = player.skills[skillNum]
    switch (skill.type) {
        case "LOCATION":
            casting = skillNum;
            if (skillCursors[skillNum] != undefined) {
                setCursor(skillCursors[skillNum]);
            } else {
                setCursor(defaultCursor);
            }
            UI.switchCasting(casting, false);
            break;
        case "SHOOT":
            casting = skillNum;
            if (skillCursors[skillNum] != undefined) {
                setCursor(skillCursors[skillNum])
            }
            UI.switchCasting(casting, false);
            break;
        case "SELF":
            break;
        case "ONGOING":
            const skillsParams = { skillNum };
            socket.emit("skill", JSON.stringify(skillsParams));
            break;
        default:
            console.log("SKILL DOESN'T HAVE A TYPE!!!!!")
            return;

    }
}


/*============================== End of Skill ===================================*/
export { uid }