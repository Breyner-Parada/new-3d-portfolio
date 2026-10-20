"use client";

import { useEffect, useMemo, useRef } from "react";
import { Color, MathUtils, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import { findInteractive, interactiveHandlers } from "./InteractiveObject";
import { HoverLabel } from "./HoverLabel";
import { themeBlend } from "./themeBlend";
import { createWaterfallMaterial, WATERFALL_PREFIX } from "./waterfallMaterial";

/** The new floating island, rebuilt asset by asset in island-assets/new-island.blend. */
export const ISLAND_MODEL = "/models/island-new.glb";
export const DRACO_PATH = "/draco/";

type Animated = { object: Object3D; kind: string; baseY: number; baseScale: number; speed: number; phase: number };
type Glowing = { material: MeshStandardMaterial; base: number; mode: "steady" | "pulse" | "flicker" };
/** An interactive object with its own material copies, so its glow doesn't leak to shared palette materials. */
type Hoverable = { root: Object3D; baseScale: number; mix: number; mats: { mat: MeshStandardMaterial; base: Color }[] };

const HOVER_TINT = new Color("#49d3f5");
const HOVER_GLOW = 0.35; // how far the emissive colour moves towards the tint
const HOVER_GROW = 0.04; // +4 % scale
const NEON_BOOST = 1.6; // emissive multiplier added at full night (x2.6)

/**
 * Renders island.glb, drives the idle animations authored as `anim` extras in Blender
 * (spin, float, orbit, hover, bob, pulse, flicker, wave) and highlights interactive objects on hover.
 */
export function IslandScene() {
  const { scene } = useGLTF(ISLAND_MODEL, DRACO_PATH);
  const { hovered } = useIslandNavigation();
  const water = useMemo(() => createWaterfallMaterial(), []);
  // Shared clock for every "wave" (cloth) material patched below.
  const waveTime = useMemo(() => ({ value: 0 }), []);

  // Scene-graph objects are mutated every frame, so they live in a ref rather than render state.
  const targets = useRef<{ animated: Animated[]; glowing: Glowing[]; hoverables: Hoverable[] }>({
    animated: [],
    glowing: [],
    hoverables: [],
  });

  useEffect(() => {
    scene.traverse((o) => {
      if (o.name.startsWith(WATERFALL_PREFIX) && (o as Mesh).isMesh) (o as Mesh).material = water;
    });
    return () => water.dispose();
  }, [scene, water]);

  useEffect(() => {
    // Cloth ("wave"): ripple the vertices along local Z. The flag's UVs run u = 0 at the pole to
    // u = 1 at the free edge (authored in Blender), so the pole side stays put.
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (o.userData?.anim !== "wave" || !mesh.isMesh) return;
      const cloth = (mesh.material as MeshStandardMaterial).clone();
      cloth.onBeforeCompile = (shader) => {
        shader.uniforms.uWaveTime = waveTime;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uWaveTime;")
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float waveAmp = uv.x;
            transformed.z += sin(uv.x * 6.0 - uWaveTime * 4.0 + uv.y * 1.5) * 0.14 * waveAmp;
            transformed.y += sin(uv.x * 4.0 - uWaveTime * 3.0) * 0.04 * waveAmp;`,
          );
      };
      mesh.material = cloth;
    });
  }, [scene, waveTime]);

  useEffect(() => {
    // Interactive roots get their own material clones first (before the glow list grabs materials).
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
    scene.traverse((o) => {
      const anim = o.userData?.anim as string | undefined;
      if (!anim) return;
      animated.push({
        object: o,
        kind: anim,
        baseY: o.position.y,
        baseScale: o.scale.y,
        speed: Number(o.userData.spin_speed ?? 0.3),
        phase: Number(o.userData.float_phase ?? animated.length * 1.7),
      });
    });

    // Flames share the palette's lava/amber materials with lanterns etc.; give them their own
    // copies so only the fire flickers.
    const flickerRoots = new Set(animated.filter((a) => a.kind === "flicker").map((a) => a.object));
    for (const root of flickerRoots) {
      root.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
      });
    }

    // Every self-lit material (screens, crystals, lava, neon strips…): these are what turn
    // into neon at night. Pulse objects additionally breathe, flicker objects (fire) jitter.
    const glowing = new Map<Material, Glowing>();
    const pulseRoots = new Set(animated.filter((a) => a.kind === "pulse").map((a) => a.object));
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      let mode: Glowing["mode"] = "steady";
      for (let p: Object3D | null = o; p; p = p.parent) {
        if (pulseRoots.has(p)) mode = "pulse";
        if (flickerRoots.has(p)) mode = "flicker";
      }
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const em = m as MeshStandardMaterial;
        if (!em.emissive || em.emissive.getHex() === 0 || glowing.has(m)) continue;
        glowing.set(m, { material: em, base: em.emissiveIntensity, mode });
      }
    });
    targets.current = { animated, glowing: [...glowing.values()], hoverables };
  }, [scene]);

  /* eslint-disable react-hooks/immutability -- per-frame mutation of the three.js scene graph is how R3F animates; these objects are not React state */
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const { animated, glowing, hoverables } = targets.current;
    water.uniforms.uTime.value = t;
    water.uniforms.uNight.value = themeBlend.night;
    waveTime.value = t;
    // Fire: two out-of-phase sines read as an irregular flicker.
    const flick = 0.5 * Math.sin(t * 13.0) + 0.3 * Math.sin(t * 7.3 + 1.3) + 0.2 * Math.sin(t * 21.7);

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
        case "flicker":
          o.scale.set(
            a.baseScale * (1 + 0.05 * Math.sin(t * 9.1)),
            a.baseScale * (1 + 0.12 * flick),
            a.baseScale * (1 + 0.05 * Math.sin(t * 8.3 + 0.7)),
          );
          break;
      }
    }
    // Neon: emissives get brighter as the night blend rises (bloom picks up everything above ~1).
    const k = 0.8 + 0.2 * Math.sin(t * 2.2);
    const neon = 1 + NEON_BOOST * themeBlend.night;
    const mul = { steady: 1, pulse: k, flicker: 0.85 + 0.25 * flick };
    for (const g of glowing) g.material.emissiveIntensity = g.base * neon * mul[g.mode];
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
