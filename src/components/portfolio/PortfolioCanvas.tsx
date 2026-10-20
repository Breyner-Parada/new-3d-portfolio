"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { IslandEnvironment } from "./IslandEnvironment";
import { IslandScene } from "./IslandScene";
import { CameraController } from "./CameraController";

export default function PortfolioCanvas() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 40, near: 0.1, far: 400, position: [27, 33, 55] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <IslandEnvironment />
      <Suspense fallback={null}>
        <IslandScene />
        <CameraController />
      </Suspense>
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
