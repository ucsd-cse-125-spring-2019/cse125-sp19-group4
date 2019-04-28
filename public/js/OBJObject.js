class OBJObject {

    constructor(gl, mesh_name, mesh_path, texture_path, has_mtl, programInfo) {
        this.programInfo = programInfo;
        this.has_mtl = has_mtl;
        const mesh_content = readTextFile(mesh_path);
        this.mesh = new OBJ.Mesh(mesh_content);
        this.mesh.name = mesh_name;
        OBJ.initMeshBuffers(gl, this.mesh);

        this.num_material = this.mesh.indicesPerMaterial.length;
        this.material_names = [];
        this.indices = [];
        this.indexBuffers = [];
        this.texture_files = [];
        if (this.has_mtl) {
            const mtl_content = readTextFile(texture_path);
            this.materials = new OBJ.MaterialLibrary(mtl_content).materials;
            for (let i = 0; i < this.num_material; ++i) {
                this.material_names[i] = this.mesh.materialNames[i];
                this.indices[i] = this.mesh.indicesPerMaterial[i];
                const name = {};
                console.log('loading materials for', mesh_name, this.materials[this.material_names[i]]);
                name["ambient"] = loadTexture(gl, this.materials[this.material_names[i]].mapAmbient.filename);
                name["diffuse"] = loadTexture(gl, this.materials[this.material_names[i]].mapDiffuse.filename);
                name["specular"] = loadTexture(gl, this.materials[this.material_names[i]].mapSpecular.filename);
                this.texture_files[i] = name;
                this.indexBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[i]), gl.STATIC_DRAW);
            }
        } else {
            for (let i = 0; i < this.num_material; ++i) {
                this.material_names[i] = this.mesh.materialNames[i];
                this.indices[i] = this.mesh.indicesPerMaterial[i];
                this.indexBuffers[i] = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[i]), gl.STATIC_DRAW);
            }
            console.log('loading texture for', mesh_name, texture_path);
            
            const texture = loadTexture(gl, texture_path);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }
    }

    render(gl, transformMatrix) {
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, this.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.textureBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, this.mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
        if (this.mesh.textureBuffer.numItems) {
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        } else {
            gl.disableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        }

        if (this.has_mtl) {
            for (let i = 0; i < this.num_material; ++i) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, this.materials[this.material_names[i]].ambient);
                gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, this.materials[this.material_names[i]].diffuse);
                gl.uniform3fv(this.programInfo.uniformLocations.specularColor, this.materials[this.material_names[i]].specular);
                gl.uniform1i(this.programInfo.uniformLocations.uSampler, i);
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, this.texture_files[i]["diffuse"]);
                gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);
                gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
            }
        } else {
            for (let i = 0; i < this.num_material; ++i) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);
                gl.activeTexture(gl.TEXTURE0);
                gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
            }
        }
    }
}

function readTextFile(file) {
    let allText = "";
    const rawFile = new XMLHttpRequest();
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

    if (url) {
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

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}