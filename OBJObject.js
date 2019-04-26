class OBJObject {

    constructor(mesh_name, texture_name, is_mtl) {
        this.has_mtl = is_mtl;
        var mesh_content = readTextFile(mesh_name);
        this.mesh = new OBJ.Mesh(mesh_content);
        console.log(this.mesh);
        OBJ.initMeshBuffers(gl, this.mesh);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.textureBuffer);
        //shaders
        var vertCode = 'attribute vec3 position;' +
            'attribute vec2 aTextureCoord;' +
            'varying highp vec2 vTextureCoord;' +
            'uniform mat4 Pmatrix;' +
            'uniform mat4 Vmatrix;' +
            'uniform mat4 Mmatrix;' +
            'attribute vec3 color;' +//the color of the point
            'varying vec3 vColor;' +
            'void main(void) { ' +//pre-built function
            'gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);' +
            'vColor = color;' +
            'vTextureCoord = aTextureCoord;' +
            '}';
        var fragCode = 'precision mediump float;' +
            'varying highp vec2 vTextureCoord;' +
            'uniform sampler2D uSampler;' +
            'varying vec3 vColor;' +
            'uniform vec3 ambientColor;' +
            'uniform vec3 diffuseColor;' +
            'uniform vec3 specularColor;' +
            'void main(void) {' +
            'vec3 Color = diffuseColor + ambientColor + specularColor;' +
            //'gl_FragColor = vec4(Color/3.0, 1);' +
            'gl_FragColor = texture2D(uSampler, vTextureCoord);' +
            '}';

        var vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, vertCode);
        gl.compileShader(vertShader);

        var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, fragCode);
        gl.compileShader(fragShader);

        var shaderprogram = gl.createProgram();
        gl.attachShader(shaderprogram, vertShader);
        gl.attachShader(shaderprogram, fragShader);
        gl.linkProgram(shaderprogram);

        this._Pmatrix = gl.getUniformLocation(shaderprogram, "Pmatrix");
        this._Vmatrix = gl.getUniformLocation(shaderprogram, "Vmatrix");
        this._Mmatrix = gl.getUniformLocation(shaderprogram, "Mmatrix");
        this._ambientColor = gl.getUniformLocation(shaderprogram, "ambientColor");
        this._diffuseColor = gl.getUniformLocation(shaderprogram, "diffuseColor");
        this._specularColor = gl.getUniformLocation(shaderprogram, "specularColor");
        this._uSampler = gl.getUniformLocation(shaderprogram, "uSampler");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
        this._position = gl.getAttribLocation(shaderprogram, "position");
        this._textureCoord = gl.getAttribLocation(shaderprogram, "aTextureCoord");
        gl.vertexAttribPointer(this._position, this.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this._position);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.textureBuffer);
        gl.vertexAttribPointer(this._textureCoord, this.mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this._textureCoord);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
        gl.useProgram(shaderprogram);
        this.num_material = this.mesh.indicesPerMaterial.length;
        this.material_name = [this.num_material];
        this.indices = [this.num_material];
        this.indexBuffers = [this.num_material];
        this.texture_files = [];
        if (is_mtl) {
            let mtl_content = readTextFile(texture_name);
            let m = new OBJ.MaterialLibrary(mtl_content);
            this.material = m.materials;
            for (let i = 0; i < this.num_material; ++i) {
                this.material_name[i] = this.mesh.materialNames[i];
                this.indices[i] = this.mesh.indicesPerMaterial[i];
                let name = [];
                name["ambient"] = loadTexture(gl, this.material[this.material_name[i]].mapAmbient.filename);
                name["diffuse"] = loadTexture(gl, this.material[this.material_name[i]].mapDiffuse.filename);
                name["specular"] = loadTexture(gl, this.material[this.material_name[i]].mapSpecular.filename);
                this.texture_files[i] = name;
                this.indexBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[i]), gl.STATIC_DRAW);
            }
        } else {
            for (let i = 0; i < this.num_material; ++i) {
                this.material_name[i] = this.mesh.materialNames[i];
                this.indices[i] = this.mesh.indicesPerMaterial[i];
                this.indexBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[i]), gl.STATIC_DRAW);
            }
            var texture = loadTexture(gl, texture_name);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);

        }
    }

    Render(proj_matrix, view_matrix, mo_matrix) {
        gl.uniformMatrix4fv(this._Pmatrix, false, proj_matrix);
        gl.uniformMatrix4fv(this._Vmatrix, false, view_matrix);
        gl.uniformMatrix4fv(this._Mmatrix, false, mo_matrix);
        if (this.has_mtl) {
            for (let i = 0; i < this.num_material; ++i) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.uniform3fv(this._ambientColor, this.material[this.material_name[i]].ambient);
                gl.uniform3fv(this._diffuseColor, this.material[this.material_name[i]].diffuse);
                gl.uniform3fv(this._specularColor, this.material[this.material_name[i]].specular);
                gl.uniform1i(this._uSampler, i);
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, this.texture_files[i]["diffuse"]);
                gl.uniform1i(this._uSampler, 0);
                gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
            }
        } else {
            for (let i = 0; i < this.num_material; ++i) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.uniform1i(this._uSampler, 0);
                gl.activeTexture(gl.TEXTURE0);
                gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
            }
        }
    }
}

function readTextFile(file) {
    var allText = "";
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                allText = rawFile.responseText;
            }
        }
    }
    rawFile.send(null);
    return allText;
}

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

    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function get_projection(angle, a, zMin, zMax) {
    var ang = Math.tan((angle * .5) * Math.PI / 180);//angle*.5
    return [
        0.5 / ang, 0, 0, 0,
        0, 0.5 * a / ang, 0, 0,
        0, 0, -(zMax + zMin) / (zMax - zMin), -1,
        0, 0, (-2 * zMax * zMin) / (zMax - zMin), 0
    ];
}