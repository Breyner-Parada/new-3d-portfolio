"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, MathUtils, Matrix4, MeshLambertMaterial, Quaternion, Vector3, type InstancedMesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import { themeBlend } from "./themeBlend";

/**
 * Low-poly clouds for the light theme, drifting round the island on a slow orbit. One flat-shaded,
 * flat-bottomed cloud shape drawn as a single instanced mesh (one draw call, ~4k triangles), opaque so
 * nothing is sorted or blended. Instead of fading they dissipate (shrink away): at dusk, and whenever
 * one drifts between the camera and the island, so they never block a zone's view.
 */

const COUNT = 12;
const DRIFT = 0.006; // rad/s of the orbit
const NEAR_SIDE = 12; // u: clouds closer to the camera than the island centre minus this dissipate

/** Pseudo-random in [0, 1) from an integer seed, so the sky is the same on every load. */
function rand(seed: number) {
  const x = Math.sin(seed * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
}

/** A few overlapping puffs, squashed and cut flat underneath, about 4 u wide. */
function cloudGeometry() {
  const puffs: [number, number, number, number][] = [
    [-1.25, 0, 0.05, 0.8],
    [0, 0.35, 0, 1.1],
    [1.15, 0.05, -0.1, 0.85],
    [0.45, 0.2, 0.55, 0.75],
    [-0.45, 0.15, -0.5, 0.75],
  ];
  const geo = mergeGeometries(
    puffs.map(([x, y, z, r]) => new IcosahedronGeometry(r, 1).scale(1, 0.75, 1).translate(x, y, z)),
  );
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), -0.3));
  geo.computeVertexNormals(); // non-indexed, so this stays faceted
  return geo;
}

type Cloud = { angle: number; radius: number; y: number; scale: number; yaw: number };

const CLOUDS: Cloud[] = Array.from({ length: COUNT }, (_, i) => {
  const below = i % 4 === 3; // a few under the island, which floats
  return {
    angle: ((i + rand(i) * 0.6) / COUNT) * Math.PI * 2,
    radius: MathUtils.lerp(32, 48, rand(i + 20)),
    y: below ? MathUtils.lerp(-14, -8, rand(i + 40)) : MathUtils.lerp(8, 22, rand(i + 40)),
    scale: MathUtils.lerp(2.4, 4, rand(i + 60)),
    yaw: rand(i + 80) * Math.PI * 2,
  };
});

export function Clouds() {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => cloudGeometry(), []);
  const material = useMemo(
    () => new MeshLambertMaterial({ color: "#f7f9fc", emissive: new Color("#9fb3cf"), emissiveIntensity: 0.3, flatShading: true }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), up: new Vector3(0, 1, 0) }), []);
  const size = useRef(CLOUDS.map(() => 0)); // current dissipation of each cloud, eased

  useFrame(({ camera, clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const day = 1 - MathUtils.smoothstep(themeBlend.night, 0.05, 0.6);
    m.visible = day > 0.001 || size.current.some((s) => s > 0.001);
    if (!m.visible) return;
    const { p, q, s, up } = tmp;
    const toCentre = camera.position.length();
    const t = clock.elapsedTime * DRIFT;
    CLOUDS.forEach((c, i) => {
      p.set(Math.cos(c.angle + t) * c.radius, c.y, Math.sin(c.angle + t) * c.radius);
      const clear = MathUtils.smoothstep(p.distanceTo(camera.position), toCentre - NEAR_SIDE - 8, toCentre - NEAR_SIDE);
      size.current[i] = MathUtils.damp(size.current[i], day * clear, 2.5, delta);
      q.setFromAxisAngle(up, c.yaw - t);
      s.setScalar(c.scale * size.current[i]);
      m.setMatrixAt(i, tmp.m.compose(p, q, s));
    });
    m.instanceMatrix.needsUpdate = true;
  });

  // never a raycast hit: the residents drop onto the first surface under them
  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} frustumCulled={false} raycast={() => null} />;
}
