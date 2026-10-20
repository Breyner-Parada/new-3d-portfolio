"use client";

import { useProgress } from "@react-three/drei";

/** Overlay shown while the GLB models and textures load. */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-30 grid place-items-center bg-ui-solid text-ui-fg">
      <div className="w-64 text-center">
        <p className="mb-3 text-sm tracking-widest text-ui-accent">DEVELOPER ISLAND</p>
        <div className="h-1 overflow-hidden rounded bg-ui-tag">
          <div className="h-full bg-teal-400 transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ui-subtle">Loading the island… {Math.round(progress)}%</p>
      </div>
    </div>
  );
}
