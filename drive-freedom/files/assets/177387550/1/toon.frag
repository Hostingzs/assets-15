varying vec2 vUv0;
varying vec4 vPositionW;
varying vec3 vNormalW;

uniform vec3 uColor;
uniform sampler2D uColorMap;
uniform vec3 uLightDir;
uniform vec4 uProperties;

uniform vec3 fog_color;
uniform float fog_start;
uniform float fog_end;
float dBlendModeFogFactor = 1.0;


vec3 addFog(vec3 color) {
    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = (fog_end - depth) / (fog_end - fog_start);
    fogFactor = clamp(fogFactor, 0.0, 1.0);
    return mix(fog_color * dBlendModeFogFactor, color, fogFactor);
}

vec4 gammaCorrectInput(vec4 raw) {
    return pow(raw, vec4(2.2));
}

vec3 gammaCorrectOutput(vec3 color) {
    return pow(color + 0.0000001, vec3(1.0 / 2.2));
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
    t = mix(start, end, ceil(t * scale + offset) / scale);

    gl_FragColor = texColor * t;    
    gl_FragColor.rgb = addFog(gl_FragColor.rgb).rgb;
    gl_FragColor.rgb = gammaCorrectOutput(gl_FragColor.rgb);
    gl_FragColor.a = 1.0;
    
}

