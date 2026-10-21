import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from "three";

/** The energy disc inside the contact portal's ring. */
export const SWIRL_NAME = "SM_Portal_Swirl";

/**
 * Spiral of energy for the portal: arms winding inwards over a soft noise, violet at the rim and
 * hot amber at the centre, fading out before the stone so the ring frames it. Uses the disc's
 * planar UVs from Blender (centre at 0.5, 0.5). Additive, a little stronger at night.
 */
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uRim;
  uniform vec3 uMid;
  uniform vec3 uCore;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;           // 0 centre .. 1 rim
    float a = atan(p.y, p.x);
    // three arms twisting inwards, turning over time
    float arms = sin(a * 3.0 + r * 9.0 - uTime * 2.2);
    float n = noise(vec2(a * 2.0, r * 6.0 - uTime * 0.8));
    float swirl = smoothstep(-0.1, 1.0, arms * 0.6 + n * 0.7);
    vec3 col = mix(uRim, uMid, smoothstep(0.95, 0.35, r));
    col = mix(col, uCore, smoothstep(0.45, 0.0, r));
    float glow = (0.35 + 0.65 * swirl) * smoothstep(1.0, 0.82, r);  // fade before the stone
    glow += smoothstep(0.3, 0.0, r) * 0.6;                          // bright heart
    gl_FragColor = vec4(col * glow * (0.85 + 0.35 * uNight), 1.0);
  }
`;

export function createSwirlMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: 0 },
      uRim: { value: new Color("#6a3cff") },
      uMid: { value: new Color("#ff7a2e") },
      uCore: { value: new Color("#ffd27a") },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}
