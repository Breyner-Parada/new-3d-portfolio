import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from "three";

/** The lava pool surface in the Systems Lab. */
export const LAVA_NAME = "SM_Lab_Lava";

/**
 * Slow molten lava: two noise layers drifting in different directions make a dark crust that
 * keeps cracking open over bright, hot spots. It's self-lit, a little hotter at night so the
 * bloom catches it. Uses the disc's planar UVs from Blender.
 */
const vertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uCrust;
  uniform vec3 uHot;
  uniform vec3 uCore;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = vUv * 5.0;
    float a = fbm(p + vec2(uTime * 0.07, uTime * 0.04));
    float b = fbm(p * 1.4 - vec2(uTime * 0.05, -uTime * 0.06) + a);
    float heat = smoothstep(0.35, 0.75, b);
    vec3 col = mix(uCrust, uHot, heat);
    col = mix(col, uCore, smoothstep(0.7, 0.95, b));
    // slow breathing glow, hotter at night
    col *= (0.9 + 0.12 * sin(uTime * 1.3)) * (1.0 + 0.35 * uNight);
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

export function createLavaMaterial() {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uCrust: { value: new Color("#2a0802") },
        uHot: { value: new Color("#ff4a12") },
        uCore: { value: new Color("#ffc65a") },
      },
    ]),
    vertexShader: vertex,
    fragmentShader: fragment,
    fog: true,
  });
}
