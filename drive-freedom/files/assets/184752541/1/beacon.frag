varying vec2 vUv0;

uniform sampler2D uGradientMap;
uniform sampler2D uNoiseMap;
uniform float uTime;
uniform vec3 uColor;

#define PI 3.14159265358979323846

void main(void)
{    
    float grad = sin(vUv0.x * PI) * sin(vUv0.y * PI);
    vec4 color = vec4(uColor, grad);

    gl_FragColor = color;
}