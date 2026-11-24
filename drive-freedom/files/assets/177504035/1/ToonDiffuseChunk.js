const TOON_VERT = `attribute vec3 aPosition;
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
`;

const TOON_FRAG = `varying vec2 vUv0;
varying vec4 vPositionW;
varying vec3 vNormalW;

uniform sampler2D uColorMap;
uniform vec3 uColorTint;
uniform vec3 uLightDir;
uniform vec4 uProperties;

uniform vec3 fog_color;
uniform float fog_start;
uniform float fog_end;
float dBlendModeFogFactor = 1.0;


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

vec3 addFog(vec3 color) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = (fog_end - depth) / (fog_end - fog_start);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    return mix(gammaCorrectInput(fog_color) * dBlendModeFogFactor, color, fogFactor);
}


void main(void)
{
    vec4 texColor = gammaCorrectInput(texture2D(uColorMap, vUv0));

    float start = uProperties[0];
    float end = uProperties[1];
    float offset = uProperties[2];
    float scale = uProperties[3];

    // quantize color ramp for lighting
    float t = -dot(vNormalW, uLightDir);
    t = (t+1.0)/2.0;
    float a = ceil(t * scale + offset) / scale;
    t = clamp(mix(start, end, a), 0.0, 1.0);

    gl_FragColor = texColor * t;
    gl_FragColor.rgb = uColorTint * gl_FragColor.rgb;
    gl_FragColor.rgb = addFog(gl_FragColor.rgb).rgb;
    gl_FragColor.rgb = gammaCorrectOutput(gl_FragColor.rgb);
    gl_FragColor.a = 1.0;
    
}
`;


const TOON_DIFFUSE_CHUNK = `
uniform sampler2D texture_diffuseMap;
uniform vec3 uLightDir;
uniform vec4 uProperties;

#ifndef SHADOW_PASS

void getEmission() {
    vec3 texColor = texture2D(texture_diffuseMap, vUv0).rgb;

    float start = uProperties[0];
    float end = uProperties[1];
    float offset = uProperties[2];
    float scale = uProperties[3];
    
    // quantize color ramp for lighting
    float t = -dot(vNormalW, uLightDir);
    t = (t+1.0)/2.0;
    float a = ceil(t * scale + offset) / scale;
    t = clamp(mix(start, end, a), 0.0, 1.0);
    
    // dEmission = vec3(1.0, 0.0, 0.0);
    dEmission = texColor * t;
}

// void evaluateFrontend() {
//     litArgs_emission = getColorWithLighting();
//     litArgs_metalness = 0.0;
//     litArgs_specularity = vec3(0.0);
//     litArgs_specularityFactor = 0.0;
//     litArgs_gloss = 0.0;
//     litArgs_albedo = vec3(0.0);
//     // litArgs_albedo = getAlbedo();
//     // litArgs_emission = 
// }

#else 

void evaluateFrontend() {
    litArgs_albedo = vec3(1);
}

#endif

`;
