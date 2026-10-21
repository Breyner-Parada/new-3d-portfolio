"use client";

import { useMemo, useRef } from "react";
import { Color, Fog, MathUtils, type DirectionalLight, type HemisphereLight, type PointLight } from "three";
import { useFrame } from "@react-three/fiber";
import { useTheme } from "@/features/theme/useTheme";
import { themeBlend } from "./themeBlend";

const DAY = {
  sky: new Color("#5d7fa8"),
  hemiSky: new Color("#bcd4ff"),
  hemiGround: new Color("#2f3b33"),
  hemi: 1.1,
  sun: 2.4,
  sunColor: new Color("#ffdcb8"),
};
const NIGHT = {
  sky: new Color("#050a18"),
  hemiSky: new Color("#3b4f8f"),
  hemiGround: new Color("#090d16"),
  hemi: 0.45,
  sun: 0.55, // moonlight
  sunColor: new Color("#9db4ff"),
};

/**
 * Coloured accent lights that only switch on at night, so the neon emissives also
 * light their surroundings. Positions are the zone anchors of new-island.blend converted
 * to Y-up (scripts/export_nav.py prints them).
 */
const NEON_LIGHTS: { position: [number, number, number]; color: string; intensity: number; distance: number }[] = [
  { position: [0, 7, 1], color: "#49d3f5", intensity: 40, distance: 16 }, // Base Camp landmark
  { position: [4.7, 5, 3.5], color: "#ff8a3d", intensity: 25, distance: 10 }, // Base Camp campfire
  { position: [17, 7.5, -11], color: "#5a8dff", intensity: 35, distance: 16 }, // Project Outpost
  { position: [-1.1, 13.5, -20.4], color: "#2ec4b6", intensity: 40, distance: 14 }, // Skill Crystals
  { position: [16.2, 0.8, 11.6], color: "#ff5a1f", intensity: 30, distance: 12 }, // Systems Lab lava pool
  { position: [-0.6, -0.5, 20.9], color: "#ffa03d", intensity: 40, distance: 14 }, // Contact Portal
];

const ease = 3; // damping speed of the day/night transition

/** Sky, fog and lights; smoothly blends between the light and dark (neon) themes. */
export function IslandEnvironment() {
  const theme = useTheme();
  const hemi = useRef<HemisphereLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const neon = useRef<(PointLight | null)[]>([]);
  const sky = useMemo(() => DAY.sky.clone(), []);
  const fog = useMemo(() => new Fog(DAY.sky.clone(), 70, 160), []);

  useFrame((_, delta) => {
    const target = theme === "dark" ? 1 : 0;
    const n = (themeBlend.night = MathUtils.damp(themeBlend.night, target, ease, delta));
    sky.copy(DAY.sky).lerp(NIGHT.sky, n);
    fog.color.copy(sky);
    if (hemi.current) {
      hemi.current.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
      hemi.current.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
      hemi.current.intensity = MathUtils.lerp(DAY.hemi, NIGHT.hemi, n);
    }
    if (sun.current) {
      sun.current.color.copy(DAY.sunColor).lerp(NIGHT.sunColor, n);
      sun.current.intensity = MathUtils.lerp(DAY.sun, NIGHT.sun, n);
    }
    neon.current.forEach((light, i) => {
      if (!light) return;
      // Always "visible" (intensity 0 by day): toggling visibility would change the light
      // count and force every material to recompile its shader mid-transition.
      light.intensity = NEON_LIGHTS[i].intensity * n;
    });
  });

  return (
    <>
      <primitive attach="background" object={sky} />
      <primitive attach="fog" object={fog} />
      <hemisphereLight ref={hemi} args={["#bcd4ff", "#2f3b33", 1.1]} />
      {/* Direction matches the Blender sun (52°, 0, -35°) converted to Y-up. */}
      <directionalLight ref={sun} position={[-18, 25, 26]} intensity={2.4} color="#ffdcb8" />
      {NEON_LIGHTS.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            neon.current[i] = el;
          }}
          position={l.position}
          color={l.color}
          intensity={0}
          distance={l.distance}
          decay={2}
        />
      ))}
    </>
  );
}
