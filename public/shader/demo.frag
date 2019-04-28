#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec4 vColor;
in vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;


out vec4 finalColor;



void main() {
    finalColor = texture(uSampler, vTextureCoord);
}