"use client";

import { useEffect, useRef, type ComponentRef } from "react";
import gsap from "gsap";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
import { islandNavigation, useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import { useCameraViews } from "./CameraTargets";

/**
 * Moves the camera between the Blender-authored views with GSAP.
 * OrbitControls are disabled while a tween runs so the two never fight.
 */
export function CameraController() {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const views = useCameraViews();
  const { zone } = useIslandNavigation();
  const placed = useRef(false);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const view = views[zone ?? "overview"];

    if (!placed.current) {
      // First frame: jump straight to the overview, no tween.
      camera.position.set(...view.position);
      c.target.set(...view.target);
      c.update();
      placed.current = true;
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 1.6;
    c.enabled = false;
    islandNavigation.setTransitioning(true);
    const tl = gsap.timeline({
      defaults: { duration, ease: "power2.inOut" },
      onUpdate: () => c.update(),
      onComplete: () => {
        c.enabled = true;
        islandNavigation.setTransitioning(false);
      },
    });
    tl.to(camera.position, { x: view.position[0], y: view.position[1], z: view.position[2] }, 0);
    tl.to(c.target, { x: view.target[0], y: view.target[1], z: view.target[2] }, 0);
    return () => {
      tl.kill();
      c.enabled = true;
    };
  }, [zone, views, camera]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minDistance={4}
      maxDistance={95}
      maxPolarAngle={Math.PI * 0.45}
    />
  );
}
