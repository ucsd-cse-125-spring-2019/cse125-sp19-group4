class Animation {
    constructor(gl, json_name, programInfo, texture_counter) {
        this.scaled_then = 0;
        this.scaled_now = 0;
        this.then = 0;
        this.programInfo = programInfo
        var ObjectJSON = JSON.parse(readTextFile(json_name))
        this.init_vertices = ObjectJSON.vertices
        this.init_normals = ObjectJSON.normals
        this.vertices = new Array(this.init_vertices.length);
        this.normals = new Array(this.init_normals.length);
        //this.uvs = ObjectJSON.uvs[0]
        this.uvs = ObjectJSON.uvs
        const init_bones = ObjectJSON.bones
        this.keyframes = ObjectJSON.animation.hierarchy;
        this.skinIndices = ObjectJSON.skinIndices;
        this.skinWeights = ObjectJSON.skinWeights;
        //this.material = ObjectJSON.materials[0];
        this.materials = ObjectJSON.materials
        const init_indices = ObjectJSON.faces;
        this.indices = new Array(this.materials.length);
        this.indices.fill([])
        for (let i = 0; i < init_indices.length; i += 11) {
            this.indices[init_indices[i + 4]].push(init_indices[i + 1]);
            this.indices[init_indices[i + 4]].push(init_indices[i + 2]);
            this.indices[init_indices[i + 4]].push(init_indices[i + 3]);
        }
        console.log(this.indices)
        this.hasTexture = false;
        this.texture_files = {};
        this.indexBuffers = {};
        this.textureBuffers = {};
        ObjectJSON.materials.forEach((element, index) => {
            const mapping = {};
            if (element.mapNormal) {
                mapping["ambient"] = loadTexture(gl, element.mapNormal);
                this.hasTexture = true;
            }
            if (element.mapDiffuse) {
                mapping["diffuse"] = loadTexture(gl, element.mapDiffuse);
                this.hasTexture = true;
            }
            if (element.mapSpecular) {
                mapping["specular"] = loadTexture(gl, element.mapSpecular);
                this.hasTexture = true;
            }
            this.texture_files[index] = { map: mapping, index: texture_counter.i };
            this.textureBuffers[index] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffers[index]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs[index]), gl.STATIC_DRAW);

            this.indexBuffers[index] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[index]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[index]), gl.STATIC_DRAW);
            this
        })
        this.fps = ObjectJSON.animation.fps;
        this.frame_time = 1 / this.fps;
        this.start_time = 0;
        this.keyframes.forEach(element => {
            if (element.keys.length > 2) {
                element.keys.forEach((element, index, array) => {
                    element.time = this.frame_time * index;
                    if (!element.pos) {
                        element.pos = array[index - 1].pos
                    }
                    if (!element.rot) {
                        element.rot = array[index - 1].rot
                    }
                    if (!element.scl) {
                        element.scl = array[index - 1].scl
                    }
                    if (index == array.length - 1) {
                        this.end_time = element.time
                    }
                })
            }
        })
        this.bones = [];
        init_bones.forEach(element => {
            let value = new Array(3)
            value[0] = element.parent
            value[1] = glMatrix.mat4.create()
            value[2] = element.inv_bind_mat
            this.bones.push(value)
        })
        this.vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        //normal buffer
        this.normal_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        //indexbuffer
    }

    render(gl, transformMatrix_array) {
        for (let i = 0; i < this.normals.length / 3; i += 3) {
            let temp_nor = glMatrix.vec3.fromValues(this.normals[i], this.normals[i + 1], this.normals[i + 2]);
            glMatrix.vec3.normalize(temp_nor, temp_nor);
            this.normals[i] = temp_nor[0]
            this.normals[i + 1] = temp_nor[1]
            this.normals[i + 2] = temp_nor[2]
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normal_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.normal);
        //gl.disableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        if (this.hasTexture) {
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        } else {
            gl.disableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        }
        Object.keys(this.materials).forEach((index) => {
            gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, this.materials[index].colorAmbient);
            gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, this.materials[index].colorDiffuse);
            gl.uniform3fv(this.programInfo.uniformLocations.specularColor, this.materials[index].colorSpecular);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffers[index]);
            gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            if (Object.keys(this.texture_files[index].map).length) {
                Object.keys(this.texture_files[index].map).forEach((e) => {
                    gl.activeTexture(gl.TEXTURE0 + this.texture_files[index].index);
                    gl.bindTexture(gl.TEXTURE_2D, this.texture_files[index].map[e]);
                    gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_files[index].index);
                });
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[index]);
            transformMatrix_array.forEach((t) => {
                gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, t);
                gl.drawElements(gl.TRIANGLES, this.indices[index].length, gl.UNSIGNED_SHORT, 0);
            });
        })
    }
    updateJoints(time, scale = 1.0, start = this.start_time, end = this.end_time) {
        //use scale to adjust speed, start and end defines which part of animation you want to play
        let now = time / 1000;
        this.scaled_now += (now - this.then) * scale;
        while (this.scaled_now < start) {
            this.scaled_now += (end - start)
        }
        while (this.scaled_now > end) {
            this.scaled_now -= (end - start)
        }
        //console.log(time_second)
        this.bones.forEach((element, index, array) => {
            let local = glMatrix.mat4.create()
            let world = glMatrix.mat4.create()
            let position = glMatrix.vec3.create()
            let rotation = glMatrix.quat.create()
            let scaling = glMatrix.vec3.create()
            scaling.fill(1)
            let keys = this.keyframes[index].keys
            if (keys.length == 2) {//such bones have no change during the animation
                position = keys[0].pos;
                rotation = keys[0].rot;
                scaling = keys[0].scl;
            } else {
                keys.forEach((element, index, array) => {
                    if (this.scaled_now == element.time) {//if the time is a keyframe
                        position = element.pos;
                        rotation = element.rot;
                        scaling = element.scl;
                    } else if (this.scaled_now > element.time && this.scaled_now < array[index + 1].time) {//if time is in between keyframes
                        let pre_pos = glMatrix.vec3.create()
                        let pre_rot = glMatrix.quat.create()
                        let pre_scl = glMatrix.vec3.create()
                        pre_scl.fill(1)
                        let post_pos = glMatrix.vec3.create()
                        let post_rot = glMatrix.quat.create()
                        let post_scl = glMatrix.vec3.create()
                        post_scl.fill(1)
                        pre_pos = element.pos;
                        pre_rot = element.rot;
                        pre_scl = element.scl
                        post_pos = array[index + 1].pos
                        post_rot = array[index + 1].rot
                        post_scl = array[index + 1].scl
                        let diff = (this.scaled_now - element.time) / this.frame_time
                        glMatrix.vec3.lerp(position, pre_pos, post_pos, diff)//interpolate two keyframes
                        glMatrix.quat.slerp(rotation, pre_rot, post_rot, diff)
                        glMatrix.vec3.lerp(scaling, pre_scl, post_scl, diff)
                    }
                })
            }

            glMatrix.mat4.fromRotationTranslationScale(local, rotation, position, scaling);

            if (element[0] == -1) {//no parent
                world = local;
            } else {//else multiply local with parent
                glMatrix.mat4.multiply(world, array[element[0]][1], local)
                element[1] = world;
            }
        })

        for (let i = 0; i < this.skinIndices.length; i += 2) {//bind vertices and normals with bones
            let temp_pos = glMatrix.vec4.fromValues(this.init_vertices[i * 3 / 2], this.init_vertices[i * 3 / 2 + 1], this.init_vertices[i * 3 / 2 + 2], 1)
            let frac_pos0 = glMatrix.vec4.create();
            let frac_pos1 = glMatrix.vec4.create();
            let temp_nor = glMatrix.vec4.fromValues(this.init_normals[i * 3 / 2], this.init_normals[i * 3 / 2 + 1], this.init_normals[i * 3 / 2 + 2], 0)
            let frac_nor0 = glMatrix.vec4.create();
            let frac_nor1 = glMatrix.vec4.create();
            let M0 = glMatrix.mat4.create();
            let M1 = glMatrix.mat4.create();
            //multiply worlds and invert bind matrices with bones
            glMatrix.mat4.multiply(M0, this.bones[this.skinIndices[i]][1], this.bones[this.skinIndices[i]][2]);
            glMatrix.mat4.multiply(M1, this.bones[this.skinIndices[i + 1]][1], this.bones[this.skinIndices[i + 1]][2]);
            glMatrix.vec4.transformMat4(frac_pos0, temp_pos, M0);
            glMatrix.vec4.transformMat4(frac_pos1, temp_pos, M1);
            //apply weights and add up
            glMatrix.vec4.scale(frac_pos0, frac_pos0, this.skinWeights[i]);
            glMatrix.vec4.scale(frac_pos1, frac_pos1, this.skinWeights[i + 1]);
            glMatrix.vec4.add(temp_pos, frac_pos0, frac_pos1);
            this.vertices[i * 3 / 2] = temp_pos[0]
            this.vertices[i * 3 / 2 + 1] = temp_pos[1]
            this.vertices[i * 3 / 2 + 2] = temp_pos[2]

            glMatrix.vec4.transformMat4(frac_nor0, temp_nor, M0);
            glMatrix.vec4.transformMat4(frac_nor1, temp_nor, M1);
            glMatrix.vec4.scale(frac_nor0, frac_nor0, this.skinWeights[i]);
            glMatrix.vec4.scale(frac_nor1, frac_nor1, this.skinWeights[i + 1]);
            glMatrix.vec4.add(temp_nor, frac_nor0, frac_nor1);
            glMatrix.vec4.normalize(temp_nor, temp_nor)//normals need normalize
            this.normals[i * 3 / 2] = temp_nor[0]
            this.normals[i * 3 / 2 + 1] = temp_nor[1]
            this.normals[i * 3 / 2 + 2] = temp_nor[2]
        }
        this.then = now;
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

function loadTexture(gl, url, color = [255, 255, 255, 255]) {
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