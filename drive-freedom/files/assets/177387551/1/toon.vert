
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv0;

uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
uniform mat3   matrix_normal;

//uniform vec3 uLightDir;

varying vec2 vUv0;
varying vec4 vPositionW;
varying vec3 vNormalW;

void main(void)
{
    vUv0 = aUv0;
    vPositionW = matrix_viewProjection * matrix_model * vec4(aPosition, 1.0);
    vec3 worldNormal = normalize(matrix_normal * aNormal);
    vNormalW = worldNormal.xyz;
    gl_Position = vPositionW;
}
