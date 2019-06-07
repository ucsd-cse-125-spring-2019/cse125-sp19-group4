class Animation {
    constructor(gl, json_name, programInfo, texture_counter, player_texture_files = null) {
        this.scaled_now = [];
        this.then = 0;
        this.programInfo = programInfo;
        var ObjectJSON = JSON.parse(readTextFile(json_name))
        this.init_vertices = ObjectJSON.vertices;
        this.init_normals = ObjectJSON.normals;
        this.uvs = ObjectJSON.uvs;
        const init_bones = ObjectJSON.bones;
        this.keyframes = ObjectJSON.animation.hierarchy;
        this.skinIndices = ObjectJSON.skinIndices;
        this.skinWeights = ObjectJSON.skinWeights;
        this.materials = ObjectJSON.materials;
        const init_indices = ObjectJSON.faces;
        this.indices = new Array(this.materials.length);
        this.indices.fill([]);
        for (let i = 0; i < init_indices.length; i += 11) {
            this.indices[init_indices[i + 4]].push(init_indices[i + 1]);
            this.indices[init_indices[i + 4]].push(init_indices[i + 2]);
            this.indices[init_indices[i + 4]].push(init_indices[i + 3]);
        }
        this.hasTexture = false;
        this.texture_files = {};
        this.indexBuffers = {};
        this.textureBuffers = {};
        this.prof_texture = {};
        if (player_texture_files != null) {
            Object.keys(player_texture_files).forEach(prof => {
                const texture = { 't': loadTexture(gl, player_texture_files[prof]), 'i': texture_counter.i };
                this.prof_texture[prof] = texture;
            });
            this.hasTexture = true;
        }
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
            if (Object.keys(mapping).length == 0) {
                mapping["ambient"] = loadTexture(gl, "", [255, 255, 255, 255]);
                this.hasTexture = true;
            }
            this.texture_files[index] = { map: mapping, index: texture_counter.i };
            this.textureBuffers[index] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffers[index]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs[index]), gl.STATIC_DRAW);

            this.indexBuffers[index] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[index]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices[index]), gl.STATIC_DRAW);
        })
        if (!this.hasTexture) {
            this.texture_index = texture_counter.i;
            this.texture = loadTexture(gl, "", [0, 0, 255, 255]);
            texture_counter.i += 1;
        }
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
        this.vertices = [];
        this.normals = [];
        this.vertexBuffers = [];
        this.normalBuffers = [];
    }
    addInstance(gl) {
        let i_vertices = new Array(this.init_vertices.length)
        let i_vertexBuffer = gl.createBuffer()
        this.vertices.push(i_vertices)
        this.vertexBuffers.push(i_vertexBuffer)

        let i_normals = new Array(this.init_normals.length)
        let i_normalBuffer = gl.createBuffer()
        this.normals.push(i_normals)
        this.normalBuffers.push(i_normalBuffer)

        this.scaled_now.push(0);
    }
    removeInstance(index) {
        this.vertices.splice(index, 1);
        this.normals.splice(index, 1);
        this.vertexBuffers.splice(index, 1);
        this.normalBuffers.splice(index, 1);
        this.scaled_now.splice(index, 1);
    }
    render(gl, transformMatrix_array, instance_idxs) {
        gl.uniform1f(this.programInfo.uniformLocations.alpha, 1.0);
        if (this.vertices.length > 1) {
            Object.keys(instance_idxs).forEach((player_i, ind) => {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[player_i]);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices[player_i]), gl.STATIC_DRAW);
                gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffers[player_i]);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals[player_i]), gl.STATIC_DRAW);
                gl.vertexAttribPointer(this.programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.normal);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
                
                Object.keys(this.materials).forEach((i) => {
                    gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, this.materials[i].colorAmbient);
                    gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, this.materials[i].colorDiffuse);
                    gl.uniform3fv(this.programInfo.uniformLocations.specularColor, this.materials[i].colorSpecular);
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffers[i]);
                    gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
                    if (Object.keys(instance_idxs).length > 0) {
                        gl.activeTexture(gl.TEXTURE0 + this.prof_texture[instance_idxs[player_i]].i);
                        gl.bindTexture(gl.TEXTURE_2D, this.prof_texture[instance_idxs[player_i]].t);
                        gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.prof_texture[instance_idxs[player_i]].i);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                        gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[ind + 1]);
                        gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
                        return;
                    }
                    if (this.hasTexture) {
                        if (Object.keys(this.texture_files[i].map).length) {
                            Object.keys(this.texture_files[i].map).forEach((e) => {
                                gl.activeTexture(gl.TEXTURE0 + this.texture_files[i].player_i);
                                gl.bindTexture(gl.TEXTURE_2D, this.texture_files[i].map[e]);
                                gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_files[i].player_i);
                            });
                        }
                    } else {
                        gl.activeTexture(gl.TEXTURE0 + this.texture_index);
                        gl.bindTexture(gl.TEXTURE_2D, this.texture);
                        gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_index);
                    }

                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                    gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[ind + 1]);
                    gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
                })
            })
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices[0]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffers[0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals[0]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(this.programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.normal);
            //gl.disableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
            Object.keys(this.materials).forEach((i) => {
                gl.uniform3fv(this.programInfo.uniformLocations.ambientColor, this.materials[i].colorAmbient);
                gl.uniform3fv(this.programInfo.uniformLocations.diffuseColor, this.materials[i].colorDiffuse);
                gl.uniform3fv(this.programInfo.uniformLocations.specularColor, this.materials[i].colorSpecular);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffers[i]);
                gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
                if (Object.keys(instance_idxs).length > 0) {
                    Object.keys(instance_idxs).forEach((player_i, ind) => {
                        gl.activeTexture(gl.TEXTURE0 + this.prof_texture[instance_idxs[player_i]].i);
                        gl.bindTexture(gl.TEXTURE_2D, this.prof_texture[instance_idxs[player_i]].t);
                        gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.prof_texture[instance_idxs[player_i]].i);
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                        gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, transformMatrix_array[ind + 1]);
                        gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
                    });
                    return;
                }
                if (this.hasTexture) {
                    if (Object.keys(this.texture_files[i].map).length) {
                        Object.keys(this.texture_files[i].map).forEach((e) => {
                            gl.activeTexture(gl.TEXTURE0 + this.texture_files[i].index);
                            gl.bindTexture(gl.TEXTURE_2D, this.texture_files[i].map[e]);
                            gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_files[i].index);
                        });
                    }
                } else {
                    gl.activeTexture(gl.TEXTURE0 + this.texture_index);
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                    gl.uniform1i(this.programInfo.uniformLocations.uSampler, this.texture_index);
                }
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffers[i]);
                transformMatrix_array.forEach((t, index) => {
                    if (index > 0) {
                        gl.uniformMatrix4fv(this.programInfo.uniformLocations.transformMatrix, false, t);
                        gl.drawElements(gl.TRIANGLES, this.indices[i].length, gl.UNSIGNED_SHORT, 0);
                    }
                });
            })
        }
    }

    resetTime(index) {//use this to reset animation
        this.scaled_now[index] = 0;
    }

    updateJoints(deltaTime, index, loop = true, scale = 1.0, start = this.start_time, end = this.end_time) {
        //use scale to adjust speed, start and end defines which part of animation you want to play
        this.scaled_now[index] += deltaTime * scale;
        while (this.scaled_now[index] < start) {
            this.scaled_now[index] += (end - start)
        }
        if (loop) {
            while (this.scaled_now[index] > end) {
                this.scaled_now[index] -= (end - start)
            }
        } else if (this.scaled_now[index] > end) {
            return;
        }

        this.bones.forEach((element, i, array) => {
            let local = glMatrix.mat4.create()
            let world = glMatrix.mat4.create()
            let position = glMatrix.vec3.create()
            let rotation = glMatrix.quat.create()
            let scaling = glMatrix.vec3.create()
            scaling.fill(1)
            let keys = this.keyframes[i].keys
            if (keys.length == 2) { //such bones have no change during the animation
                position = keys[0].pos;
                rotation = keys[0].rot;
                scaling = keys[0].scl;
            } else {
                keys.forEach((element, i, array) => {
                    if (this.scaled_now[index] == element.time) {//if the time is a keyframe
                        position = element.pos;
                        rotation = element.rot;
                        scaling = element.scl;
                    } else if (this.scaled_now[index] > element.time && this.scaled_now[index] < array[i + 1].time) {//if time is in between keyframes
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
                        post_pos = array[i + 1].pos
                        post_rot = array[i + 1].rot
                        post_scl = array[i + 1].scl
                        let diff = (this.scaled_now[index] - element.time) / this.frame_time
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
            this.vertices[index][i * 3 / 2] = temp_pos[0]
            this.vertices[index][i * 3 / 2 + 1] = temp_pos[1]
            this.vertices[index][i * 3 / 2 + 2] = temp_pos[2]

            glMatrix.vec4.transformMat4(frac_nor0, temp_nor, M0);
            glMatrix.vec4.transformMat4(frac_nor1, temp_nor, M1);
            glMatrix.vec4.scale(frac_nor0, frac_nor0, this.skinWeights[i]);
            glMatrix.vec4.scale(frac_nor1, frac_nor1, this.skinWeights[i + 1]);
            glMatrix.vec4.add(temp_nor, frac_nor0, frac_nor1);
            glMatrix.vec4.normalize(temp_nor, temp_nor)//normals need normalize
            this.normals[index][i * 3 / 2] = temp_nor[0]
            this.normals[index][i * 3 / 2 + 1] = temp_nor[1]
            this.normals[index][i * 3 / 2 + 2] = temp_nor[2]
        }
    }
}