const socket = io();

let command = '';

socket.on('broadcast', function(obj) {
    console.log('msg from server: ' + obj.number);
    console.log('msg from server: ' + obj.string);
    console.log('msg from server: ' + obj.array);
    console.log('msg from server: ' + obj.myObj.name);
});


socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
    let n = msg.indexOf(': cmd ');
    if (n != -1) {
        command = msg.substring(n+6);
        $('#messages').append($('<li>').text('\'' + command + '\''));
    }
});

$('.game-area').html($('#intro-screen-template').html());
/*
====================================Canvas===================================
*/
import getWrappedGL from '/public/util/debug.js';
import readStringFrom from '/public/util/io.js';

let cubeRotation = 0.0;

/**
 * Start here
 */
function main() {

    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#glCanvas");
    // set the canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = 0.8 * window.innerHeight;
    console.log('width', canvas.width, 'height', canvas.height);


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

    // Here's where we call the routine that builds all the
    // objects we'll be drawing.
    const buffers = initBuffers(gl);

    let then = 0;

    // Draw the scene repeatedly
    function render(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        if (command == 'cube') {
            drawScene(gl, programInfo, buffers, deltaTime);
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
            gl.clearDepth(1.0);                 // Clear everything

            // Clear the canvas before we start drawing on it.

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}


/**
 * Initialize the buffers we'll need. For this demo, we just have one object -- 
 * a simple three-dimensional cube.
 * @param  {WebGLRenderingContext} gl
 */
function initBuffers(gl) {
    // Create a buffer for the cube's vertex positions.
    /** @type {WebGLBuffer} */
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the cube.

    const positions = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Now set up the colors for the faces. We'll use solid colors
    // for each face.

    const faceColors = [
        [255, 255, 255, 255],    // Front face: white
        [255, 0, 0, 255],    // Back face: red
        [0, 255, 0, 255],    // Top face: green
        [0, 0, 255, 255],    // Bottom face: blue
        [255, 255, 0, 255],    // Right face: yellow
        [255, 0, 255, 255],    // Left face: purple
    ];

    // Convert the array of colors into a table for all the vertices.

    let colors = [];

    for (let j = 0; j < faceColors.length; ++j) {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    /** @type {WebGLBuffer} */
    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(colors), gl.STATIC_DRAW);

    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.

    /** @type {WebGLBuffer} */
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    const indices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23,   // left
    ];

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
    };
}


/**
 * Draw the scene.
 * @param  {WebGLRenderingContext} gl
 * @param  {Object} programInfo
 * @param  {WebGLBuffer} buffers
 * @param  {Number} deltaTime
 */
function drawScene(gl, programInfo, buffers, deltaTime) {
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
    const modelViewMatrix = glMatrix.mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    // TODO: camera matrix

    glMatrix.mat4.translate(modelViewMatrix,     // destination matrix
        modelViewMatrix,     // matrix to translate
        [-0.0, 0.0, -6.0]);  // amount to translate
    glMatrix.mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,  // matrix to rotate
        cubeRotation,     // amount to rotate in radians
        [0, 0, 1]);       // axis to rotate around (Z)
    glMatrix.mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,  // matrix to rotate
        cubeRotation,// amount to rotate in radians
        [0, 1, 0]);       // axis to rotate around (X)
    glMatrix.mat4.rotate(modelViewMatrix,  // destination matrix
        modelViewMatrix,  // matrix to rotate
        cubeRotation,// amount to rotate in radians
        [1, 0, 0]);       // axis to rotate around (Y)

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
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
        const numComponents = 4;
        const type = gl.UNSIGNED_BYTE;
        const normalize = true;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

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
        modelViewMatrix);

    {
        const vertexCount = 36;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    // Update the rotation for the next draw

    cubeRotation += deltaTime;
}


/**
 * Initialize a shader program, so WebGL knows how to draw our data
 * @param  {WebGLRenderingContext} gl
 * @param  {string} vsFilename
 * @param  {string} fsFilename
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

socket.on('role already taken', function(msg){
    alert(msg);
});

socket.on('enter game', function(){
    console.log('enter game');
    $('.game-area').html($('#ingame-template').html());
    $('form').submit(function(e){
        e.preventDefault(); // prevents page reloading
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });    

    main();
});

socket.on('wait for game begin', function(){
    $('.game-area').html($('#loading-screen-template').html());
});

$('#GodButton').click(function(){
    socket.emit("play as god");
});

$('#SurvivorButton').click(function(){
    socket.emit("play as survivor");
});