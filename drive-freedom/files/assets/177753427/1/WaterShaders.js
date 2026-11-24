const WATER_VERT = `attribute vec3 aPosition;
attribute vec2 aUv0;

varying vec2 vUv0;
varying vec3 WorldPosition;

uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;

uniform float uTime;

void main(void)
{
    vUv0 = aUv0;   
    vec3 pos = aPosition;

    pos.y +=  cos(pos.z * 5.0 + uTime) * 0.1 * sin(pos.x * 5.0 + uTime);
    
    gl_Position = matrix_viewProjection * matrix_model * vec4(pos, 1.0);    
    
    WorldPosition = pos;
}
`;

const WATER_FRAG = `// These uniforms are all injected automatically by PlayCanvas
// uniform sampler2D uSceneDepthMap;
// uniform vec4 uScreenSize;
// uniform mat4 matrix_view;

uniform vec3 fog_color;
uniform float fog_start;
uniform float fog_end;
float dBlendModeFogFactor = 1.0;

uniform vec4 uCameraParams; // 1 / camera_far,      camera_far,     (1 - f / n) / 2,        (1 + f / n) / 2
uniform sampler2D uSurfaceMap;
uniform float uTime;
// uniform bool isMask;

varying vec2 vUv0;
varying vec3 WorldPosition;

vec3 OCEAN_COLOR = vec3(0.0, 0.7, 1.0);

vec3 decodeGamma(vec3 raw) {
    return pow(raw, vec3(2.2));
}

vec4 gammaCorrectInput(vec4 color) {
    return vec4(decodeGamma(color.xyz), color.w);
}

vec3 gammaCorrectInput(vec3 color) {
    return decodeGamma(color);
}

vec3 gammaCorrectOutput(vec3 color) {
    return pow(color + 0.0000001, vec3(1.0 / 2.2));
}
vec4 addFog(vec4 color) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = (fog_end - depth) / (fog_end - fog_start);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    return mix(gammaCorrectInput(vec4(OCEAN_COLOR, 0.0)) * dBlendModeFogFactor, color, fogFactor);
}

void main(void)
{
    // water color
    vec4 color = gammaCorrectInput(vec4(OCEAN_COLOR, 1.0));
    
    // scroll uvs
    vec2 uv = vUv0 * 150.0;
    // uv.x += uTime * 0.125;
    uv.y += uTime * 0.125;
    
    vec4 tex = texture2D(uSurfaceMap, uv);
    vec4 final = vec4(color.rgb + (tex.rgb * 0.1), color.a);
    
    gl_FragColor = addFog(final);
}`;

