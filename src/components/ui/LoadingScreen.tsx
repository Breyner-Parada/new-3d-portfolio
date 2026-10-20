"use client";

import { useProgress } from "@react-three/drei";

/** Overlay shown while the GLB models and textures load. */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  if (!active && progress >= 100) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-30 grid place-items-center bg-slate-950 text-slate-100">
      <div className="w-64 text-center">
        <p className="mb-3 text-sm tracking-widest text-amber-400">DEVELOPER ISLAND</p>
        <div className="h-1 overflow-hidden rounded bg-white/10">
          <div className="h-full bg-teal-400 transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Loading the island… {Math.round(progress)}%</p>
      </div>
    </div>
  );
}
