import getWrappedGL from '/public/util/debug.js';
import readStringFrom from '/public/util/io.js';
import Camera from '/public/js/camera.js'

const camera = new Camera();
let uid = '';

const FACE_mat = glMatrix.mat4.create();
glMatrix.mat4.fromYRotation(FACE_mat, glMatrix.glMatrix.toRadian(180));
const FACE = [0.0, 0.0, -1.0];
const NEG_FACE = glMatrix.vec3.create();
glMatrix.vec3.negate(NEG_FACE, FACE);

const model_ref = {};

const transform_ref = {
    'castle': glMatrix.mat4.create(),
    'male': glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), [5, 0, 0]),
    'player': glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), [0, -1, 0]),
    'slime': glMatrix.mat4.fromTranslation(glMatrix.mat4.create(), [0, -2, 0]),
    'f16': glMatrix.mat4.fromScaling(glMatrix.mat4.create(), [5, 5, 5]),
};

const models = {};

// ============================ Network IO ================================

const socket = io();

let command = '';

socket.on('chat message', function (msg) {
    $('#messages').append($('<li>').text(msg));
    let n = msg.indexOf(': cmd ');
    if (n != -1) {
        command = msg.substring(n + 6);
        $('#messages').append($('<li>').text('\'' + command + '\''));
    }
});

$('.game-area').html($('#intro-screen-template').html());


socket.on('role already taken', function (msg) {
    alert(msg);
});

socket.on('enter game', function (msg) {
    console.log('enter game');
    $('.game-area').html($('#ingame-template').html());
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    const data = JSON.parse(msg);
    uid = data[socket.id].name;
    console.log("my name is", uid);

    main();
});

socket.on('wait for game begin', function (msg) {
    $('.game-area').html($('#loading-screen-template').html());
    $('#queue').html(msg);
});

$('#GodButton').click(function () {
    socket.emit("play as god");
});

$('#SurvivorButton').click(function () {
    socket.emit("play as survivor");
});

socket.on('game_status', function (msg) {
    const data = JSON.parse(msg);
    const player = data[uid];
    camera.setPosition(player.position);
    // console.log(player.position);
    

    let event = new CustomEvent("statusUpdate", {detail: data});
    document.dispatchEvent(event);


    Object.keys(data).forEach(function (name) {
        const obj = data[name];
        if (typeof models[name] === 'undefined') {
            models[name] = { m: model_ref[obj.model], t: glMatrix.mat4.clone(transform_ref[obj.model]) };
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
        glMatrix.mat4.multiply(models[name].t, transformation, transform_ref[obj.model]);

    });
});

socket.on('tiktok', (miliseconds) => {
    let event = new CustomEvent("timerUpdate", {detail: miliseconds});
    document.dispatchEvent(event);
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
    canvas.height = 0.8 * window.innerHeight;

    // canvas.addEventListener("mousedown", mouseDown, false);
    // canvas.addEventListener("mouseup", mouseUp, false);
    // canvas.addEventListener("mouseout", mouseUp, false);
    // canvas.addEventListener("mousemove", mouseMove, false);

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
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            transformMatrix: gl.getUniformLocation(shaderProgram, 'uTransformMatrix'),
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            ambientColor: gl.getUniformLocation(shaderProgram, "uAmbientColor"),
            diffuseColor: gl.getUniformLocation(shaderProgram, "uDiffuseColor"),
            specularColor: gl.getUniformLocation(shaderProgram, "uSpecularColor"),
        },
    };
    // Tell WebGL to use our program when drawing
    gl.useProgram(shaderProgram);

    // Here's where we call the routine that builds all the objects we'll be drawing.
    // const buffers = initCubeBuffers(gl);

    model_ref['castle'] = new OBJObject(gl, "castle", "/public/model/castle.obj", "", false, programInfo);
    model_ref['male'] = new OBJObject(gl, "male", "/public/model/male.obj", "", false, programInfo);
    model_ref['player'] = new OBJObject(gl, "player", "/public/model/player.obj", "", false, programInfo);
    model_ref['slime'] = new OBJObject(gl, "slime", "/public/model/slime.obj", "", false, programInfo);
    model_ref['f16'] = new OBJObject(gl, "f16", "/public/model/f16-model.obj", "/public/model/f16-texture.bmp", false, programInfo);

    models['male'] = { m: model_ref['male'], t: glMatrix.mat4.clone(transform_ref['male']) };
    // models['castle'] = { m: model_ref['castle'], t: glMatrix.mat4.create() };
    models['f16'] = { m: model_ref['f16'], t: glMatrix.mat4.clone(transform_ref['f16']) };
    let then = 0;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
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
        let move = true;
        
        if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
            move = false;
            // do nothing
        } else if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('LEFT')) {
            glMatrix.vec3.negate(direction, camera.Right);
        } else if (Key.isDown('UP') && Key.isDown('DOWN') && Key.isDown('RIGHT')) {
            direction = camera.Right;
        } else if (Key.isDown('UP') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
            glMatrix.vec3.negate(direction, camera.Foward);
        } else if (Key.isDown('DOWN') && Key.isDown('LEFT') && Key.isDown('RIGHT')) {
            direction = camera.Foward;
        } else if (Key.isDown('UP') && Key.isDown('DOWN') || Key.isDown('LEFT') && Key.isDown('RIGHT')) {
            move = false;
            // do nothing
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
            move = false;
        }

        if (move) {
            socket.emit('movement', JSON.stringify(direction));
            // console.log(direction);
        }
        
        drawScene(gl, programInfo, models, camera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}


/**
 * Draw the scene.
 * @param  {WebGLRenderingContext} gl
 * @param  {Object} programInfo
 * @param  {Object} models
 * transformation
 * @param  {Camera} camera
 */
function drawScene(gl, programInfo, models, camera) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = 60 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = glMatrix.mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    glMatrix.mat4.perspective(projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = camera.getViewMatrix();

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);
    
    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    Object.keys(models).forEach(function (name) {
        const model = models[name];
        model.m.render(gl, model.t);
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

/*================= Keyboard events ======================*/

const Key = {
    _pressed: {},
    
    jumped: false,

    cmd: {
        32: 'JUMP',         // space
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
        if (event.keyCode == 32 && this.jumped) {
            // do nothing
        } else if (event.keyCode in this.cmd) {
            this._pressed[this.cmd[event.keyCode]] = true;
        }
    },

    onKeyup: function (event) {
        if (event.keyCode == 32) {
            this.jumped = false;
        }
        else if (event.keyCode in this.cmd) {
            delete this._pressed[this.cmd[event.keyCode]];
        }
    }
};

function getUid() {
    return uid;
}

export { uid }
