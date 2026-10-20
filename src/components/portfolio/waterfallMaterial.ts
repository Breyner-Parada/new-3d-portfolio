import { Color, ShaderMaterial, UniformsLib, UniformsUtils } from "three";

/** Meshes that get the animated water: SM_Waterfall_A, SM_Waterfall_B… */
export const WATERFALL_PREFIX = "SM_Waterfall_";

/**
 * Animated water for the SM_Waterfall_* meshes. Their UVs are authored in Blender as
 * u = across the fall, v = height, so scrolling v makes the streaks run downhill.
 */
const waterVertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const waterFragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uNight;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  uniform vec3 uNeon;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    // Two layers of vertical streaks falling at different speeds.
    vec2 p = vec2(vUv.x * 4.0, vUv.y * 2.5 + uTime * 2.2);
    float s = noise(p) * 0.6 + noise(p * vec2(2.3, 1.7) + vec2(0.0, uTime * 1.3)) * 0.4;
    float streak = smoothstep(0.5, 0.75, s);
    // Soft edges across the fall.
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    vec3 day = mix(uDeep, uFoam, streak);
    vec3 night = mix(uDeep * 0.35, uNeon * 1.8, streak); // > 1 so bloom catches only the streaks
    gl_FragColor = vec4(mix(day, night, uNight), mix(0.75, 0.95, streak) * mix(0.55, 1.0, edge));
    #include <fog_fragment>
  }
`;

export function createWaterfallMaterial() {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uNight: { value: 0 },
        uDeep: { value: new Color("#3f9fc4") },
        uFoam: { value: new Color("#e8fbff") },
        uNeon: { value: new Color("#49d3f5") },
      },
    ]),
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
}
