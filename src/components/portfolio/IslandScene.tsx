"use client";

import { useEffect, useRef } from "react";
import { Color, MathUtils, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import { findInteractive, interactiveHandlers } from "./InteractiveObject";
import { HoverLabel } from "./HoverLabel";

export const ISLAND_MODEL = "/models/island.glb";
export const DRACO_PATH = "/draco/";

type Animated = { object: Object3D; kind: string; baseY: number; speed: number; phase: number };
type Pulsing = { material: Material & { emissiveIntensity: number }; base: number };
/** An interactive object with its own material copies, so its glow doesn't leak to shared palette materials. */
type Hoverable = { root: Object3D; baseScale: number; mix: number; mats: { mat: MeshStandardMaterial; base: Color }[] };

const HOVER_TINT = new Color("#49d3f5");
const HOVER_GLOW = 0.35; // how far the emissive colour moves towards the tint
const HOVER_GROW = 0.04; // +4 % scale

/**
 * Renders island.glb, drives the idle animations authored as `anim` extras in Blender
 * (spin, float, orbit, hover, bob, pulse) and highlights interactive objects on hover.
 */
export function IslandScene() {
  const { scene } = useGLTF(ISLAND_MODEL, DRACO_PATH);
  const { hovered } = useIslandNavigation();

  // Scene-graph objects are mutated every frame, so they live in a ref rather than render state.
  const targets = useRef<{ animated: Animated[]; pulsing: Pulsing[]; hoverables: Hoverable[] }>({
    animated: [],
    pulsing: [],
    hoverables: [],
  });

  useEffect(() => {
    // Interactive roots get their own material clones first (before the pulse list grabs materials).
    const hoverables: Hoverable[] = [];
    const roots = new Set<Object3D>();
    scene.traverse((o) => {
      if (o.userData?.interactive && findInteractive(o) === o) roots.add(o);
    });
    for (const root of roots) {
      const mats: Hoverable["mats"] = [];
      root.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        const clone = (m: Material) => {
          const c = m.clone() as MeshStandardMaterial;
          if (c.emissive) mats.push({ mat: c, base: c.emissive.clone() });
          return c;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
      });
      hoverables.push({ root, baseScale: root.scale.x, mix: 0, mats });
    }

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
    targets.current = { animated, pulsing: [...pulsing.values()], hoverables };
  }, [scene]);

  /* eslint-disable react-hooks/immutability -- per-frame mutation of the three.js scene graph is how R3F animates; these objects are not React state */
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const { animated, pulsing, hoverables } = targets.current;

    // Hover highlight: ease a 0..1 mix towards the target, then apply glow + scale.
    for (const h of hoverables) {
      const goal = h.root.name === hovered ? 1 : 0;
      if (goal === 0 && h.mix < 0.001) continue;
      h.mix = MathUtils.damp(h.mix, goal, 10, delta);
      h.root.scale.setScalar(h.baseScale * (1 + HOVER_GROW * h.mix));
      for (const { mat, base } of h.mats) mat.emissive.copy(base).lerp(HOVER_TINT, HOVER_GLOW * h.mix);
    }

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

  return (
    <>
      <primitive object={scene} {...interactiveHandlers} />
      <HoverLabel scene={scene} hovered={hovered} />
    </>
  );
}

useGLTF.preload(ISLAND_MODEL, DRACO_PATH);
