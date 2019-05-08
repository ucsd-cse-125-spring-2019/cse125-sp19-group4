#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec4 vColor;
in vec2 vTextureCoord;
in highp vec3 vNormal;
in highp vec3 vVertexPosition;
uniform sampler2D uSampler;
uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform vec3 ViewPosition;

out vec4 finalColor;

vec3 doLight(vec3 normal, vec3 viewDir, vec3 fragPos) {
    float att = 1.0;
    vec3 LightDir = vec3(0, -1, 0);
    LightDir = normalize(LightDir);
    vec3 reflectDir = reflect(LightDir, normal);
    float diff = 2.0 * max(dot(normal, LightDir), 0.0);
    float spec = pow(dot(reflectDir, viewDir), 2.0);
    vec3 diffuse = uDiffuseColor * diff;
    vec3 specular = uSpecularColor * spec;
    vec3 ambient = uAmbientColor;
    return diffuse + ambient + specular;
}

void main() {
    vec3 ViewDir = normalize(ViewPosition - vVertexPosition);
    vec3 Color = doLight(vNormal, ViewDir, vVertexPosition);
    //vec3 Color = uAmbientColor + uDiffuseColor + uSpecularColor;
    finalColor = texture(uSampler, vTextureCoord) * vec4(Color/2.0, 1.0);;
}