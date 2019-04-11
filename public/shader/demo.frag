#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec4 vColor;

out vec4 finalColor;

void main() {
    finalColor = vColor;
}