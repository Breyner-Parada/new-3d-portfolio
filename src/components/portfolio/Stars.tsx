"use client";

import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils, ShaderMaterial, type Points } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { themeBlend } from "./themeBlend";

const COUNT = 2800; // whole sphere: only ~5 % of it is on screen at once
const RADIUS = 190; // just behind the moon (180), inside the camera's far plane

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    // each star breathes at its own rate; a second, faster sine adds the shimmer
    vTwinkle = 0.7 + 0.25 * sin(uTime * aSpeed + aPhase) + 0.1 * sin(uTime * aSpeed * 3.7 + aPhase * 2.0);
    gl_PointSize = aSize * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = pow(smoothstep(0.5, 0.0, d), 1.4);
    gl_FragColor = vec4(vColor, core * vTwinkle * uOpacity);
  }
`;

/** Pseudo-random in [0, 1) from an integer seed, so the sky is the same on every load. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function starGeometry() {
  const pos = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  const phase = new Float32Array(COUNT);
  const speed = new Float32Array(COUNT);
  const color = new Float32Array(COUNT * 3);
  const tints = [
    [1, 1, 1],
    [0.78, 0.86, 1],
    [1, 0.92, 0.8],
  ];
  for (let i = 0; i < COUNT; i++) {
    // uniform on the sphere (the camera looks down at a floating island, so sky shows below the horizon too)
    const u = rand(i * 3 + 1) * 2 - 1;
    const a = rand(i * 3 + 2) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos.set([RADIUS * r * Math.cos(a), RADIUS * u, RADIUS * r * Math.sin(a)], i * 3);
    const big = rand(i * 7 + 5) > 0.95;
    size[i] = big ? MathUtils.lerp(5.5, 8, rand(i + 9)) : MathUtils.lerp(2, 4, rand(i + 11));
    phase[i] = rand(i * 13 + 3) * Math.PI * 2;
    speed[i] = MathUtils.lerp(0.6, 2.4, rand(i * 17 + 7));
    const tint = tints[Math.floor(rand(i * 19 + 2) * tints.length)];
    const boost = big ? 1.7 : 1; // > 1 so the bloom picks up the brightest ones
    color.set(tint.map((c) => c * boost), i * 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new BufferAttribute(size, 1));
  geo.setAttribute("aPhase", new BufferAttribute(phase, 1));
  geo.setAttribute("aSpeed", new BufferAttribute(speed, 1));
  geo.setAttribute("aColor", new BufferAttribute(color, 3));
  return geo;
}

/**
 * Twinkling star field for the dark theme. It follows the camera (no parallax, like a real sky) and
 * fades in late in the dusk transition, out early at dawn, in step with the sky colour.
 */
export function Stars() {
  const points = useRef<Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => starGeometry(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPixelRatio: { value: 1 } },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  /* eslint-disable react-hooks/immutability -- per-frame uniform updates on a three.js material, not React state */
  useFrame(({ camera, clock }) => {
    const opacity = MathUtils.smoothstep(themeBlend.night, 0.35, 0.95);
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
    if (points.current) {
      points.current.visible = opacity > 0.001;
      points.current.position.copy(camera.position);
      points.current.rotation.y = clock.elapsedTime * 0.004; // the sky turns, very slowly
    }
  });
  /* eslint-enable react-hooks/immutability */

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={-2} />;
}
