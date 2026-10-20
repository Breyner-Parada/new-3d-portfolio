"use client";

import { useEffect, useRef } from "react";
import type { Material, Mesh, Object3D } from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { interactiveHandlers } from "./InteractiveObject";

export const ISLAND_MODEL = "/models/island.glb";
export const DRACO_PATH = "/draco/";

type Animated = { object: Object3D; kind: string; baseY: number; speed: number; phase: number };
type Pulsing = { material: Material & { emissiveIntensity: number }; base: number };

/**
 * Renders island.glb and drives the light idle animations authored as
 * `anim` extras in Blender (spin, float, orbit, hover, bob, pulse).
 */
export function IslandScene() {
  const { scene } = useGLTF(ISLAND_MODEL, DRACO_PATH);

  // Scene-graph objects are mutated every frame, so they live in a ref rather than render state.
  const targets = useRef<{ animated: Animated[]; pulsing: Pulsing[] }>({ animated: [], pulsing: [] });

  useEffect(() => {
    const animated: Animated[] = [];
    const pulsing = new Map<Material, Pulsing>();
    scene.traverse((o) => {
      const anim = o.userData?.anim as string | undefined;
      if (!anim) return;
      animated.push({
        object: o,
        kind: anim,
        baseY: o.position.y,
        speed: Number(o.userData.spin_speed ?? 0.3),
        phase: Number(o.userData.float_phase ?? animated.length * 1.7),
      });
      if (anim === "pulse") {
        o.traverse((child) => {
          const mats = (child as Mesh).material;
          for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
            const em = m as Pulsing["material"];
            if (em.emissiveIntensity !== undefined && !pulsing.has(m)) pulsing.set(m, { material: em, base: em.emissiveIntensity });
          }
        });
      }
    });
    targets.current = { animated, pulsing: [...pulsing.values()] };
  }, [scene]);

  /* eslint-disable react-hooks/immutability -- per-frame mutation of the three.js scene graph is how R3F animates; these objects are not React state */
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const { animated, pulsing } = targets.current;
    for (const a of animated) {
      const o = a.object;
      switch (a.kind) {
        case "spin":
          // Blender local Z (the ring axis) is local Y after the glTF Y-up conversion; local Y becomes -Z.
          if (o.userData.spin_axis === "local_y") o.rotateZ(-a.speed * delta);
          else o.rotateY(a.speed * delta);
          break;
        case "orbit":
          o.rotateY(0.25 * delta);
          break;
        case "float":
          o.position.y = a.baseY + Math.sin(t * 1.2 + a.phase) * 0.08;
          break;
        case "float_spin":
          o.position.y = a.baseY + Math.sin(t * 1.2 + a.phase) * 0.06;
          o.rotateY(0.6 * delta);
          break;
        case "hover":
          o.position.y = a.baseY + Math.sin(t * 2 + a.phase) * 0.15;
          break;
        case "bob":
          o.position.y = a.baseY + Math.sin(t * 1.1 + a.phase) * 0.04;
          o.rotation.z = Math.sin(t * 0.9 + a.phase) * 0.03;
          break;
      }
    }
    const k = 0.8 + 0.2 * Math.sin(t * 2.2);
    for (const p of pulsing) p.material.emissiveIntensity = p.base * k;
  });
  /* eslint-enable react-hooks/immutability */

  return <primitive object={scene} {...interactiveHandlers} />;
}

useGLTF.preload(ISLAND_MODEL, DRACO_PATH);
