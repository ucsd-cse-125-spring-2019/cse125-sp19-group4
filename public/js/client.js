import getWrappedGL from '/public/util/debug.js';
import readStringFrom from '/public/util/io.js';
import Camera from '/public/js/camera.js'

const camera = new Camera();
const player = {
    uid: '',
    health: 0,
    position: [0, 0, 0],
}
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
    player.uid = data[socket.id].name;
    console.log("my name is", player.uid);

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
    player.position = data[player.uid].position;
    player.health = data[player.uid].health;
    // TODO
    camera.setPosition(data[player.uid].position);
    // TODO
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
    // set the canvas to full screen
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
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // Here's where we call the routine that builds all the objects we'll be drawing.
    // const buffers = initCubeBuffers(gl);
    const castle_mesh = initMesh(gl, "/public/model/castle.obj");
    const male_mesh = initMesh(gl, "/public/model/male.obj");
    let trans_left = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(trans_left, [5, 0, 0]);
    let trans_right = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(trans_right, [0, 0, 0]);
    const meshes = [{ 'm': male_mesh, 't': trans_left },
    { 'm': male_mesh, 't': trans_right },
    { 'm': castle_mesh, 't': glMatrix.mat4.create() }];

    let then = 0;
    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;

        if (Key.isDown('UP')) {
            const movement = {
                command: "FORWARD",
                direction: camera.Foward,
            }
            socket.emit("movement", JSON.stringify(movement));
        }
        if (Key.isDown('DOWN')) {
            const dir = glMatrix.vec3.create();
            glMatrix.vec3.negate(dir, camera.Foward);
            const movement = {
                command: "BACKWARD",
                direction: dir,
            }
            socket.emit("movement", JSON.stringify(movement));
        }
        if (Key.isDown('LEFT')) {
            const dir = glMatrix.vec3.create();
            glMatrix.vec3.negate(dir, camera.Right);
            const movement = {
                command: "LEFT",
                direction: dir,
            }
            socket.emit("movement", JSON.stringify(movement));
        }
        if (Key.isDown('RIGHT')) {
            const movement = {
                command: "RIGHT",
                direction: camera.Right,
            }
            socket.emit("movement", JSON.stringify(movement));
        }
        if (Key.isDown('ROTLEFT')) {
            camera.rotateLeft(deltaTime);
        }
        if (Key.isDown('ROTRIGHT')) {
            camera.rotateRight(deltaTime);
        }

        drawScene(gl, programInfo, meshes, camera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

/**
 * Initialize the buffers of the mesh
 * @param    {WebGLRenderingContext} gl
 * @param    {String} filepath
 */
function initMesh(gl, filepath) {
    //load model
    function readTextFile(file) {
        let text;
        const rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function () {
            if (rawFile.readyState === 4) {
                if (rawFile.status === 200 || rawFile.status == 0) {
                    text = rawFile.responseText;
                }
            }
        }
        rawFile.send(null);
        return text;
    }

    const male_text = readTextFile(filepath);

    const mesh = new OBJ.Mesh(male_text);
    OBJ.initMeshBuffers(gl, mesh);

    return mesh;
}


/**
 * Draw the scene.
 * @param  {WebGLRenderingContext} gl
 * @param  {Object} programInfo
 * @param  {Array} meshes mashes from initMesh(gl, filename) with 
 * transformation
 * @param  {Camera} camera
 */
function drawScene(gl, programInfo, meshes, camera) {
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

    // Now move the drawing position a bit to where we want to
    // start drawing the square.
    meshes.forEach(function (mesh) {
        let modelView = glMatrix.mat4.create();
        glMatrix.mat4.multiply(modelView, modelViewMatrix, mesh.t);

        // Tell WebGL how to pull out the positions from the position
        // buffer into the vertexPosition attribute
        {
            const numComponents = mesh.m.vertexBuffer.itemSize;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.m.vertexBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition);
        }

        // Tell WebGL how to pull out the colors from the color buffer
        // into the vertexColor attribute.
        {
            const numComponents = mesh.m.normalBuffer.itemSize;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.m.normalBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexColor);
        }

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.m.indexBuffer);

        // Tell WebGL to use our program when drawing
        gl.useProgram(programInfo.program);

        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelView);

        {
            const vertexCount = mesh.m.indexBuffer.numItems;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }
    })
}


/**
 * Initialize a shader program, so WebGL knows how to draw our data
 * @param    {WebGLRenderingContext} gl
 * @param    {string} vsFilename
 * @param    {string} fsFilename
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
 * @param  {string} source
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

    cmd: {
        37: 'LEFT',         // left arrow
        38: 'UP',           // up arrow
        39: 'RIGHT',        // right arrow
        40: 'DOWN',         // down arrow
        65: 'LEFT',         // A
        68: 'RIGHT',        // D
        69: 'ROTLEFT',      // E     
        81: 'ROTRIGHT',     // Q
        83: 'DOWN',         // S
        87: 'UP',           // W
    },

    isDown: function (command) {
        return this._pressed[command];
    },

    onKeydown: function (event) {
        if (event.keyCode in this.cmd) {
            this._pressed[this.cmd[event.keyCode]] = true;
        }
    },

    onKeyup: function (event) {
        if (event.keyCode in this.cmd) {
            delete this._pressed[this.cmd[event.keyCode]];
        }
    }
};

