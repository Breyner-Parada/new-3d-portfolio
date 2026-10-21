"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useTheme } from "@/features/theme/useTheme";
import { IslandEnvironment } from "./IslandEnvironment";
import { IslandScene } from "./IslandScene";
import { CameraController } from "./CameraController";
import { CelestialBodies } from "./CelestialBodies";
import { Stars } from "./Stars";

export default function PortfolioCanvas() {
  const theme = useTheme();

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 40, near: 0.1, far: 400, position: [27, 33, 55] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <IslandEnvironment />
      <Stars />
      <CelestialBodies />
      <Suspense fallback={null}>
        <IslandScene />
        <CameraController />
      </Suspense>
      {/* Neon glow: bloom only exists in dark mode, so the light theme pays nothing for it. */}
      {theme === "dark" && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.85} luminanceSmoothing={0.25} radius={0.6} />
        </EffectComposer>
      )}
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
