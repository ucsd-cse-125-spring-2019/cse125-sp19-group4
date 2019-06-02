import {WebGLDebugUtils} from './webgl-debug.js'

let throwOnGLError = (err, funcName, args) => {
    throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
};

let getWrappedGL = (canvas) => {
    let gl = canvas.getContext('webgl2');
    gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);

    return gl;
}

export default getWrappedGL