#version 300 es

in vec4 aVertexPosition;
in vec2 aTextureCoord;
in vec3 normal;
uniform mat4 uTransformMatrix;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out highp vec2 vTextureCoord;
out highp vec3 vVertexPosition;
out highp vec3 vNormal;
void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * uTransformMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
    vVertexPosition = vec3(gl_Position/gl_Position.w);
    vNormal = normal;
}