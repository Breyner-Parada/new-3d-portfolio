"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  Euler,
  MathUtils,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type ShaderMaterial,
} from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import { findInteractive, interactiveHandlers } from "./InteractiveObject";
import { HoverLabel } from "./HoverLabel";
import { themeBlend } from "./themeBlend";
import { createWaterfallMaterial, WATERFALL_PREFIX } from "./waterfallMaterial";
import { createLavaMaterial, LAVA_NAME } from "./lavaMaterial";
import { createSwirlMaterial, SWIRL_NAME } from "./swirlMaterial";

/** The new floating island, rebuilt asset by asset in island-assets/new-island.blend. */
export const ISLAND_MODEL = "/models/island-new.glb";
export const DRACO_PATH = "/draco/";

type Animated = {
  object: Object3D;
  kind: string;
  baseY: number;
  baseScale: number;
  speed: number;
  phase: number;
  /** Robot arm joints (Turret, Upper, Fore, Claw) with their rest rotation. */
  joints?: { node: Object3D; rest: Euler }[];
};
type Glowing = { material: MeshStandardMaterial; base: number; mode: "steady" | "pulse" | "flicker" | "blink"; phase: number };
/** An interactive object with its own material copies, so its glow doesn't leak to shared palette materials. */
type Hoverable = { root: Object3D; baseScale: number; mix: number; mats: { mat: MeshStandardMaterial; base: Color }[] };

const HOVER_TINT = new Color("#49d3f5");
const HOVER_GLOW = 0.35; // how far the emissive colour moves towards the tint
const HOVER_GROW = 0.04; // +4 % scale
const NEON_BOOST = 0.8; // emissive multiplier added at full night (x1.8)
const CAMP_FLAG = "SM_BaseCamp_Flag";
const CAMP_FLAG_HEIGHT = 1.15; // u, from its top edge (y = 0) down
const COLOMBIA = ["#fcd116", "#003893", "#ce1126"]; // yellow, blue, red

/**
 * Renders island.glb, drives the idle animations authored as `anim` extras in Blender
 * (spin, float, orbit, hover, bob, pulse, flicker, wave, blink, robot) and highlights interactive objects on hover.
 */
export function IslandScene() {
  const { scene } = useGLTF(ISLAND_MODEL, DRACO_PATH);
  const { hovered } = useIslandNavigation();
  const water = useMemo(() => createWaterfallMaterial(), []);
  const lava = useMemo(() => createLavaMaterial(), []);
  const swirl = useMemo(() => createSwirlMaterial(), []);
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
      if (!(o as Mesh).isMesh) return;
      if (o.name.startsWith(WATERFALL_PREFIX)) (o as Mesh).material = water;
      if (o.name === LAVA_NAME) (o as Mesh).material = lava;
      if (o.name === SWIRL_NAME) (o as Mesh).material = swirl;
    });
    return () => {
      water.dispose();
      lava.dispose();
      swirl.dispose();
    };
  }, [scene, water, lava, swirl]);

  useEffect(() => {
    // Cloth ("wave"): ripple the vertices along local Z. The flag's UVs run u = 0 at the pole to
    // u = 1 at the free edge (authored in Blender), so the pole side stays put.
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (o.userData?.anim !== "wave" || !mesh.isMesh) return;
      const cloth = (mesh.material as MeshStandardMaterial).clone();
      const colombia = o.name === CAMP_FLAG;
      if (colombia) cloth.color.set("#ffffff");
      cloth.onBeforeCompile = (shader) => {
        shader.uniforms.uWaveTime = waveTime;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uWaveTime;\nvarying float vFlagY;")
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            vFlagY = position.y;
            float waveAmp = uv.x;
            transformed.z += sin(uv.x * 6.0 - uWaveTime * 4.0 + uv.y * 1.5) * 0.14 * waveAmp;
            transformed.y += sin(uv.x * 4.0 - uWaveTime * 3.0) * 0.04 * waveAmp;`,
          );
        if (!colombia) return;
        // Colombia's flag, painted by height on the unrippled cloth (top edge at y = 0): yellow over the
        // top half, then blue and red a quarter each.
        const [yellow, blue, red] = COLOMBIA.map((c) => new Color(c));
        const vec = (c: Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vFlagY;")
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float stripe = -vFlagY / ${CAMP_FLAG_HEIGHT.toFixed(2)};
            diffuseColor.rgb *= stripe < 0.5 ? ${vec(yellow)} : stripe < 0.75 ? ${vec(blue)} : ${vec(red)};`,
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
          // shader materials (waterfall, lava, portal swirl) are driven by shared uniforms every
          // frame; a copy would freeze, and they have no emissive to tint anyway
          if ((m as ShaderMaterial).isShaderMaterial) return m;
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
        phase: Number(o.userData.float_phase ?? o.userData.blink_phase ?? animated.length * 1.7),
        joints:
          anim === "robot"
            ? ["Turret", "Upper", "Fore", "Claw"].flatMap((j) => {
                const node = o.getObjectByName(`${o.name}_${j}`);
                return node ? [{ node, rest: node.rotation.clone() }] : [];
              })
            : undefined,
      });
    });

    // Flames share the palette's lava/amber materials with lanterns etc.; give them their own
    // copies so only the fire flickers. Blinking objects need their own too (the three racks share
    // one mesh); interactive ones already got copies from the hover setup above.
    const flickerRoots = new Set(animated.filter((a) => a.kind === "flicker").map((a) => a.object));
    const blinkRoots = new Map(animated.filter((a) => a.kind === "blink").map((a) => [a.object, a.phase]));
    for (const root of [...flickerRoots, ...[...blinkRoots.keys()].filter((r) => !roots.has(r))]) {
      root.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
      });
    }

    // Every self-lit material (screens, crystals, lava, neon strips…): these are what turn
    // into neon at night. Pulse objects additionally breathe, flicker objects (fire) jitter,
    // blink objects (status LEDs, beacons) switch on and off irregularly.
    const glowing = new Map<Material, Glowing>();
    const pulseRoots = new Set(animated.filter((a) => a.kind === "pulse").map((a) => a.object));
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      let mode: Glowing["mode"] = "steady";
      let phase = 0;
      for (let p: Object3D | null = o; p; p = p.parent) {
        if (pulseRoots.has(p)) mode = "pulse";
        if (flickerRoots.has(p)) mode = "flicker";
        if (blinkRoots.has(p)) [mode, phase] = ["blink", blinkRoots.get(p)!];
      }
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const em = m as MeshStandardMaterial;
        if (!em.emissive || em.emissive.getHex() === 0 || glowing.has(m)) continue;
        glowing.set(m, { material: em, base: em.emissiveIntensity, mode, phase });
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
    lava.uniforms.uTime.value = t;
    lava.uniforms.uNight.value = themeBlend.night;
    swirl.uniforms.uTime.value = t;
    swirl.uniforms.uNight.value = themeBlend.night;
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
        case "robot": {
          // pick-and-place loop: the turret sweeps while shoulder, elbow and wrist bend in turn
          const [turret, upper, fore, claw] = a.joints ?? [];
          const c = t * 0.55;
          if (turret) turret.node.rotation.y = turret.rest.y + Math.sin(c) * 0.9;
          if (upper) upper.node.rotation.x = upper.rest.x + Math.sin(c * 2 + 0.6) * 0.22;
          if (fore) fore.node.rotation.x = fore.rest.x + Math.sin(c * 2 + 1.6) * 0.32;
          if (claw) claw.node.rotation.y = claw.rest.y + t * 1.4;
          break;
        }
      }
    }
    // Neon: emissives get brighter as the night blend rises (bloom picks up everything above ~1).
    const k = 0.8 + 0.2 * Math.sin(t * 2.2);
    const neon = 1 + NEON_BOOST * themeBlend.night;
    const mul = { steady: 1, pulse: k, flicker: 0.85 + 0.25 * flick, blink: 1 };
    for (const g of glowing) {
      // blink: mostly on, dropping out irregularly (two sines at unrelated rates, per-object phase)
      const m = g.mode === "blink" ? (Math.sin(t * 3.1 + g.phase) * Math.sin(t * 1.7 + g.phase * 1.3) > -0.35 ? 1 : 0.15) : mul[g.mode];
      g.material.emissiveIntensity = g.base * neon * m;
    }
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
