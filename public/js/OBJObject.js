class OBJObject {

    constructor(gl, mesh_name, mesh_path, texture_path, has_mtl, texture_counter, programInfo, defaultColor = [0, 0, 255], alpha = 1.0, player_texture_files = null) {
        this.programInfo = programInfo;
        this.has_mtl = has_mtl;
        const mesh_content = readTextFile(mesh_path);
        this.mesh = new OBJ.Mesh(mesh_content);

        this.mesh.name = mesh_name;
        this.alpha = alpha;
        OBJ.initMeshBuffers(gl, this.mesh);
        this.material_names = this.mesh.materialNames;
        this.indexBuffers = {};
        this.texture_files = {};
        this.prof_texture = {};
        if (player_texture_files != null) {
            Object.keys(player_texture_files).forEach(prof => {
                const texture = { 't': loadTexture(gl, player_texture_files[prof]), 'i': texture_counter.i };
                this.prof_texture[prof] = texture;
            });
            this.hasTexture = true;
        }
        if (this.has_mtl) {
            this.mtl_content = readTextFile(texture_path);
            this.materials = new OBJ.MaterialLibrary(this.mtl_content).materials;
            Object.keys(this.materials).forEach((name) => {
                const material = this.materials[name];
                const mapping = {};
                if (material.mapAmbient.filename) {
                    mapping["ambient"] = loadTexture(gl, material.mapAmbient.filename);
                }
                if (material.mapDiffuse.filename) {
                    mapping["diffuse"] = loadTexture(gl, material.mapDiffuse.filename);
                }
                if (material.mapSpecular.filename) {
                    mapping["specular"] = loadTexture(gl, material.mapSpecular.filename);
                }
                if (Object.keys(mapping).length == 0) {
                    mapping["ambient"] = loadTexture(gl, "", [255, 255, 255, 255]);
                }
                this.texture_files[name] = { map: mapping, index: texture_counter.i };
                this.indexBuffers[name] = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[name]);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.mesh.indicesPerMaterial[this.mesh.materialIndices[name]]), gl.STATIC_DRAW);
            });
        } else {
            this.texture_index = texture_counter.i;
            this.indexBuffers[0] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[0]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.mesh.indices), gl.STATIC_DRAW);
            this.texture = loadTexture(gl, texture_path, defaultColor);
            texture_counter.i += 1;
        }
    }

    render(gl, transformMatrix_array) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, this.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.normal, this.mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.normal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.textureBuffer);
        gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, this.mesh.textureBuffer.itemSize, gl.FLOAT, false, 0, 0);
        if (this.mesh.textureBuffer.numItems) {
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        } else {
            gl.disableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        }

        if (this.has_mtl) {
            const materials_keys = Object.keys(this.materials);
            for (let i = 0; i < materials_keys.length; i++) {
                const name = materials_keys[i];
                const material = this.materials[name];
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[name]);
                gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, material.ambient);
                gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, material.diffuse);
                gl.uniform3fv(this.programInfo.uniformLocations.specularColor, material.specular);
                gl.uniform1f(this.programInfo.uniformLocations.alpha, this.alpha);
                if (Object.keys(transformMatrix_array[0]).length > 0) {
                    Object.keys(transformMatrix_array[0]).forEach((player_i, ind) => {
                        gl.activeTexture(gl.TEXTURE0 + this.prof_texture[transformMatrix_array[0][player_i]].i);
                        gl.bindTexture(gl.TEXTURE_2D, this.prof_texture[transformMatrix_array[0][player_i]].t);
                        gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.prof_texture[transformMatrix_array[0][player_i]].i);
                        gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[ind + 1]);
                        gl.drawElements(gl.TRIANGLES, this.mesh.indicesPerMaterial[this.mesh.materialIndices[name]].length, gl.UNSIGNED_SHORT, 0);
                    });
                    return;
                }
                const map_keys = Object.keys(this.texture_files[name].map);
                if (map_keys.length > 0) {
                    for (let j = 0; j < map_keys.length; j++) {
                        gl.activeTexture(gl.TEXTURE0 + this.texture_files[name].index);
                        gl.bindTexture(gl.TEXTURE_2D, this.texture_files[name].map[map_keys[j]]);
                        gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_files[name].index);
                    }
                }
                for (let j = 1; j < transformMatrix_array.length; j++) {
                    gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[j]);
                    gl.drawElements(gl.TRIANGLES, this.mesh.indicesPerMaterial[this.mesh.materialIndices[name]].length, gl.UNSIGNED_SHORT, 0);
                }
            }
        } else {
            gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, [1, 1, 1]);
            gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, [1, 1, 1]);
            gl.uniform3fv(this.programInfo.uniformLocations.specularColor, [1, 1, 1]);
            // gl.uniform1f(this.programInfo.uniformLocations.shininess, 2);
            gl.uniform1f(this.programInfo.uniformLocations.alpha, this.alpha);

            gl.activeTexture(gl.TEXTURE0 + this.texture_index);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_index);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[0]);

            for (let i = 1; i < transformMatrix_array.length; i++) {
                gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[i]);
                gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
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

function loadTexture(gl, url, color = [255, 255, 255]) {
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
    color[3] = 255;
    const pixel = new Uint8Array(color);  // opaque blue
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