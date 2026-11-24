varying vec2 vUv0;

uniform sampler2D uGradientMap;
uniform sampler2D uNoiseMap;
uniform float uTime;
uniform vec3 uColor;

void main(void)
{    
    vec2 uv = vec2(uTime + vUv0.x, uTime + vUv0.y / 30.0);

    float noise = texture2D(uNoiseMap, uv).r;
    float grad = texture2D(uGradientMap, vUv0).r;
    vec4 color = vec4(uColor, grad * noise);

    gl_FragColor = color;
}
