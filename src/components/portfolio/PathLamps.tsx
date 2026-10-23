"use client";

import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Raycaster,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { DRACO_PATH, ISLAND_MODEL } from "./IslandScene";
import { themeBlend } from "./themeBlend";
import route from "./avatarRoute.json";

/**
 * Lamp posts along the island's paths: every SPACING u of the avatar's loop, alternating sides, on the
 * ground beside the path. Skipped on stairs and slopes, where the ground beside the path isn't the path
 * (a wall, a drop or a building), and where the Base Camp and portal already have their own lanterns;
 * plus a few hand-placed ones (OFF_ROUTE) on paths the loop doesn't take.
 * Two instanced meshes (post and glass), so two draw calls for all of them; the glass glows a little by
 * day and, like the island's neon, strongly enough at night for the bloom to pick it up.
 */

const SPACING = 5.5; // u along the loop between lamps
const MIN_GAP = 4; // u between any two lamps
const SIDE = 1.3; // u off the path's centre line, clear of the avatar and the dog
const LANTERNS = ["SM_BaseCamp_Lanterns", "SM_Portal_Lanterns"]; // zones already lit by the island model
const LIT_GAP = 3; // u from any of the island's own lanterns
const GLOW = { day: 0.5, night: 2.6 };
/** x/z beside paths the avatar's loop doesn't take: the forest path down past the waterfall, west of the desk. */
const OFF_ROUTE: readonly [number, number][] = [
  [-11.5, 1],
  [-8.2, 7.8],
];

function partsGeometry() {
  const post = (geo: BufferGeometry, y: number) => geo.translate(0, y, 0);
  return {
    frame: mergeGeometries([
      post(new BoxGeometry(0.28, 0.12, 0.28), 0.06), // foot
      post(new BoxGeometry(0.11, 1.62, 0.11), 0.87), // post
      post(new BoxGeometry(0.34, 0.05, 0.34), 1.69), // lantern floor
      post(new ConeGeometry(0.27, 0.2, 4).rotateY(Math.PI / 4), 2.11), // roof
    ]),
    glass: new BoxGeometry(0.26, 0.3, 0.26).translate(0, 1.87, 0),
  };
}

/** Lamp positions (on the ground) and headings, worked out once from the route and the island's surface. */
function placeLamps(island: Object3D) {
  island.updateMatrixWorld();
  // where the island's own lanterns stand (their vertices; the meshes spread over whole zones)
  const lit: Vector3[] = [];
  for (const name of LANTERNS)
    island.getObjectByName(name)?.traverse((o) => {
      const pos = (o as Mesh).isMesh ? (o as Mesh).geometry.attributes.position : null;
      for (let i = 0; pos && i < pos.count; i += 8) lit.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    });
  const points = route.points.map(([x, y, z]) => new Vector3(x, y, z));
  const ray = new Raycaster();
  const down = new Vector3(0, -1, 0);
  const lamps: { at: Vector3; yaw: number }[] = [];
  let next = SPACING / 2;
  let walked = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = a.distanceTo(b);
    while (walked + len >= next) {
      const p = a.clone().lerp(b, (next - walked) / len);
      next += SPACING;
      if (Math.abs(b.y - a.y) / len > 0.3) continue; // stairs
      const t = b.clone().sub(a).setY(0).normalize();
      // alternate sides, falling back to the other one where the preferred side is a ledge or a drop
      const preferred = lamps.length % 2 === 0 ? SIDE : -SIDE;
      for (const side of [preferred, -preferred]) {
        const at = p.clone().add(new Vector3(t.z, 0, -t.x).multiplyScalar(side));
        if (lit.some((l) => l.distanceTo(at) < LIT_GAP)) break;
        if (lamps.some((l) => l.at.distanceTo(at) < MIN_GAP)) break; // the loop passes some paths twice
        ray.set(new Vector3(at.x, p.y + 2, at.z), down);
        const hit = ray.intersectObject(island, true).find((h) => h.face && h.face.normal.y > 0.8);
        if (!hit || Math.abs(hit.point.y - p.y) > 0.35) continue; // a ledge, a drop or a building, not the path
        lamps.push({ at: hit.point.clone(), yaw: Math.atan2(t.x, t.z) });
        break;
      }
    }
    walked += len;
  }
  for (const [x, z] of OFF_ROUTE) {
    ray.set(new Vector3(x, 30, z), down);
    const hit = ray.intersectObject(island, true).find((h) => h.face && h.face.normal.y > 0.8);
    if (hit) lamps.push({ at: hit.point.clone(), yaw: 0 });
  }
  return lamps;
}

export function PathLamps() {
  const { scene: island } = useGLTF(ISLAND_MODEL, DRACO_PATH);
  const lamps = useMemo(() => placeLamps(island), [island]);
  const { frame, glass } = useMemo(() => partsGeometry(), []);
  const frameMat = useMemo(() => new MeshStandardMaterial({ color: "#3b2d24", roughness: 0.85, flatShading: true }), []);
  const glassMat = useMemo(
    () => new MeshStandardMaterial({ color: "#ffe6b5", emissive: "#ffb24d", emissiveIntensity: GLOW.day, roughness: 0.4 }),
    [],
  );
  useEffect(
    () => () => {
      frame.dispose();
      glass.dispose();
      frameMat.dispose();
      glassMat.dispose();
    },
    [frame, glass, frameMat, glassMat],
  );

  const matrices = useMemo(() => {
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const one = new Vector3(1, 1, 1);
    return lamps.map(({ at, yaw }) => new Matrix4().compose(at, q.setFromAxisAngle(up, yaw), one));
  }, [lamps]);

  /* eslint-disable react-hooks/immutability -- per-frame uniform on a three.js material, not React state */
  useFrame(() => {
    glassMat.emissiveIntensity = GLOW.day + (GLOW.night - GLOW.day) * themeBlend.night;
  });
  /* eslint-enable react-hooks/immutability */

  const ref = (mesh: { setMatrixAt(i: number, m: Matrix4): void; computeBoundingSphere(): void } | null) => {
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.computeBoundingSphere();
  };

  return (
    <>
      <instancedMesh ref={ref} args={[frame, frameMat, matrices.length]} />
      <instancedMesh ref={ref} args={[glass, glassMat, matrices.length]} />
    </>
  );
}
