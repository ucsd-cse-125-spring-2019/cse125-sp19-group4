import getWrappedGL from '/public/util/debug.js';
import readStringFrom from '/public/util/io.js';
import Camera from '/public/js/camera.js'
import * as StatusBar from '/public/js/statusBar.js'

const UIdebug = true;

const camera = new Camera();
let uid = '';
let prev_direction = glMatrix.vec3.create();

const FACE_mat = glMatrix.mat4.create();
glMatrix.mat4.fromYRotation(FACE_mat, glMatrix.glMatrix.toRadian(180));
const FACE = [0.0, 0.0, -1.0];
const NEG_FACE = glMatrix.vec3.create();
glMatrix.vec3.negate(NEG_FACE, FACE);

const model_ref = {};

const transform_ref = {
    'terrain': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [5, 5, 5]),
    'bullet': glMatrix.mat4.create(),
    'male': glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), [5, 0, 0]),
    'player': glMatrix.mat4.create(),
    'slime': glMatrix.mat4.create(),
    'f16': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [5, 5, 5]),
    'tree': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [5, 5, 5]),
};

const objects = {};
const cast_models = [];

const texture_counter = {i: 0};

const mouse_pos = {x: 0, y:0};

const cursor = glMatrix.vec3.create();


// ============================ Network IO ================================

const socket = io();

socket.on('chat message', function (msg) {
    openChatBox();
    $('#messages').append($('<li>').text(msg));
    if (!messaging) {
        chatBoxFade();
    }
});

$('.game-area').html($('#intro-screen-template').html());

socket.on('role already taken', function (msg) {
    alert(msg);
});

socket.on('enter game', function (msg) {
    console.log('enter game');

    UIInitialize();
    main();

    const data = JSON.parse(msg);
    uid = data[socket.id].name;
    let player = data[socket.id];
    console.log("my name is", uid);
    StatusBar.InitializeSkills(player.skills);
    StatusBar.InitializeStatus(player.status);
});

socket.on('wait for game begin', function (msg) {
    $('#loadingBox').css('display', 'block');
    $('#menu').css('opacity', '0.1');
    $('#GodButton').prop('disabled', true);
    $('#SurvivorButton').prop('disabled', true);

    const {playerCount, statusString} = JSON.parse(msg);
    for (let i in playerCount) {
        $('#' + i).html(playerCount[i]);
    }
    $('#numStatus').html(statusString);
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

$('#BuilderButton').click(function () {
    socket.emit("play as survivor", JSON.stringify("Builder"));
});

socket.on('game_status', function (msg) {
    const start = Date.now();
    const data = JSON.parse(msg);
    const player = data[uid];
    camera.setPosition(player.position);
    // console.log(player.position);

    // Update statusbar
    StatusBar.statusUpdate(player.status);
    StatusBar.coolDownUpdate(player.skills);


    Object.keys(data).forEach(function (name) {
        const obj = data[name];
        if (typeof objects[name] === 'undefined') {
            objects[name] = { m: obj.model, t: glMatrix.mat4.clone(transform_ref[obj.model]) };
        }
        // update face
        const dot = glMatrix.vec3.dot(obj.direction, FACE);
        const axis = glMatrix.vec3.create();
        if (glMatrix.vec3.equals(obj.direction, FACE)) {
            axis[1] = 1.0;
        } else if (glMatrix.vec3.equals(obj.direction, NEG_FACE)) {
            axis[1] = -1.0;
        } else {
            glMatrix.vec3.cross(axis, FACE, obj.direction);
        }
        const angle = Math.acos(dot);
        const rotation = glMatrix.mat4.create();
        glMatrix.mat4.rotate(rotation, FACE_mat, angle, axis)
        // update position
        const translation = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation, obj.position);
        const transformation = glMatrix.mat4.create();
        glMatrix.mat4.multiply(transformation, translation, rotation);
        glMatrix.mat4.multiply(objects[name].t, transformation, transform_ref[obj.model]);

    });

    Object.keys(objects).forEach(function (name) {
        if (name === 'terrain' || name === 'male' || name === 'f16') {

        } else if (typeof data[name] === 'undefined') {
            delete objects[name];
        }
    });
    const end = Date.now();
    $('#processing').html(end - start);
    $('#bytes').html(msg.length);
    
});

socket.on('tiktok', (miliseconds) => {
    StatusBar.timerUpdate(miliseconds);
});

socket.on('pong', (latency) => {
    // console.log(socket.id, 'Ping:', latency, 'ms');
    $('#ping').html(latency);
});


// ====================================Canvas===================================

/**
 * Start here
 */
function main() {

    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#glCanvas");
    // set the canvas resolution
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener("mousedown", mouseDown, false);
    window.addEventListener("contextmenu", contextmenu, false);
    // canvas.addEventListener("mouseup", mouseUp, false);
    // canvas.addEventListener("mouseout", mouseUp, false);
    window.addEventListener("mousemove", mouseMove, false);

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
            viewPosition: gl.getUniformLocation(shaderProgram, "ViewPosition"),
        },
    };
    // Tell WebGL to use our program when drawing
    gl.useProgram(shaderProgram);

    // Here's where we call the routine that builds all the objects we'll be drawing.
    // const buffers = initCubeBuffers(gl); 

    model_ref['terrain'] = new OBJObject(gl, "terrain", "/public/model/terrain2.obj", "/public/model/terrain2.mtl", true, texture_counter, programInfo);
    model_ref['player'] = new OBJObject(gl, "player", "/public/model/player_texture.obj", "/public/model/player_texture.mtl", true, texture_counter, programInfo);
    model_ref['slime'] = new OBJObject(gl, "slime", "/public/model/slime.obj", "", false, texture_counter, programInfo, [0, 255, 0, 255]);
    model_ref['f16'] = new OBJObject(gl, "f16", "/public/model/f16-model1.obj", "/public/model/f16-texture.bmp", false, texture_counter, programInfo);
    model_ref['tree'] = new OBJObject(gl, "tree", "/public/model/treeGreen.obj", "/public/model/treeGreen.mtl", true, texture_counter, programInfo);
    model_ref['bullet'] = new OBJObject(gl, "bullet", "/public/model/bullet.obj", "", false, texture_counter, programInfo);

    objects['terrain'] = { m: 'terrain', t: glMatrix.mat4.clone(transform_ref['terrain']) };
    objects['f16'] = { m: 'f16', t: glMatrix.mat4.clone(transform_ref['f16']) };
    cast_models[0] = { m: 'slime', t: glMatrix.mat4.clone(transform_ref['slime']) };
    let then = 0;
    // Draw the scene repeatedly
    function render(now) {
        const deltaTime = (now - then) / 1000;
        $('#fps').html(Math.floor(1 / deltaTime));
        $('#render').html(Math.ceil(deltaTime * 1000));

        then = now;

        // Camera Rotation
        if (Key.isDown('ROTLEFT') && Key.isDown('ROTRIGHT')) {
            // do nothing
        } else if (Key.isDown('ROTLEFT')) {
            camera.rotateLeft(deltaTime);
        } else if (Key.isDown('ROTRIGHT')) {
            camera.rotateRight(deltaTime);
        }

        // Jump
        if (Key.isDown('JUMP')) {
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
            glMatrix.vec3.negate(direction, camera.Foward);
        } else if (Key.isDown('DOWN') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
            direction = camera.Foward;
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
            prev_direction = direction;
        }

        // Attack
        if (Key.isDown('MELEE')) {
            delete Key._pressed['MELEE'];
            socket.emit('melee');
        }
        else if (Key.isDown('SHOOT')) {
            delete Key._pressed['SHOOT'];
            socket.emit('shoot');
        }

        // Skill
        if (casting >= 0) {
            if (typeof objects['casting'] === 'undefined') {
                objects['casting'] = { m: cast_models[casting].m, t: glMatrix.mat4.clone(cast_models[casting].t) };
            }
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
            const translation = glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), cursor);
            glMatrix.mat4.multiply(objects['casting'].t, translation, cast_models[casting].t);
        }
        drawScene(gl, programInfo, objects, camera);

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
    gl.clearColor(200.0, 200.0, 200.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
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
    Object.keys(objects).forEach(function (obj_name) {
        const obj = objects[obj_name];
        if (typeof to_render[obj.m] === 'undefined') {
            to_render[obj.m] = [];
        }
        to_render[obj.m].push(obj.t);
    });
    Object.keys(to_render).forEach(function (m) {
        model_ref[m].render(gl, to_render[m]);
    });
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


/**
 * @param  {WebGLRenderingContext} gl
 * @param  {String} url
 */
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be download over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    if (url !== '') {
        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                srcFormat, srcType, image);

            // WebGL1 has different requirements for power of 2 images
            // vs non power of 2 images so check if the image is a
            // power of 2 in both dimensions.
            if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                // Yes, it's a power of 2. Generate mips.
                gl.generateMipmap(gl.TEXTURE_2D);
            } else {
                // No, it's not a power of 2. Turn off mips and set
                // wrapping to clamp to edge
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = url;
    }

    return texture;
}

/*================= Mouse events ======================*/

// let drag = false;
// let old_x, old_y;


// const mouseDown = function (e) {
//     drag = true;
//     old_x = e.pageX, old_y = e.pageY;
//     e.preventDefault();
//     return false;
// };

// const mouseUp = function (e) {
//     drag = false;
// };

// const mouseMove = function (e) {
//     if (!drag) return false;
//     camera.ProcessMouseMovement(e.pageX - old_x, e.pageY - old_y);
//     camera.updateCameraVectors();
//     old_x = e.pageX, old_y = e.pageY;
//     e.preventDefault();
// };

const contextmenu = function (e) {
    e.preventDefault();
}

const mouseDown = function (e) {
    e.preventDefault();
    switch (e.which) {
        case 1:
            // left click
            if (casting == 0) {
                console.log('slime fired');
                const skillsParams = { skillNum: 0, skillName: 'Slime', position: cursor };
                socket.emit('skill', JSON.stringify(skillsParams));
            }
            break;
        case 3:
            // right click
            if (casting >= 0) {
                casting = -1;
                console.log('stop casting');
                delete objects['casting'];
            }
            break;
        default:
            break;
    }
    return false;
};

const mouseMove = function (e) {
    mouse_pos.x = e.pageX;
    mouse_pos.y = e.pageY;

};

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
        74: 'SHOOT',        // J   
        75: 'MELEE',        // K  
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
        } else if (event.keyCode == 32 && this.jumped) {
            // do nothing
        } else if (event.keyCode >= 49 && event.keyCode <= 57) { //key 1 - 9, skills
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
/*================================End of UI===================================*/

/*================================= Skill ===================================*/
let casting = -1;

function handleSkill(uid, skillNum) {
    if (uid === "God") {
        switch (skillNum) {
            case 0:
                // Spawn Slime
                casting = 0;
                break;
            // case 1:
            //     break;
            default:
            // do nothing
        }
    }
    // const skillsParams = {};
    // socket.emit('skill', JSON.stringify(skillsParams));
}

/*============================== End of Skill ===================================*/
export { uid }