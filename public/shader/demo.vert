#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uTransformMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out highp vec2 vTextureCoord;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * uTransformMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
}