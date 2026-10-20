"use client";

import { useMemo } from "react";
import { Box3, Vector3, type Object3D } from "three";
import { Html } from "@react-three/drei";
import { labelFor } from "./InteractiveObject";

/** Floating name tag above the hovered interactive object ("click me" affordance). */
export function HoverLabel({ scene, hovered }: { scene: Object3D; hovered: string | null }) {
  const info = useMemo(() => {
    if (!hovered) return null;
    const object = scene.getObjectByName(hovered);
    if (!object) return null;
    const box = new Box3().setFromObject(object);
    const center = box.getCenter(new Vector3());
    return { text: labelFor(object), position: [center.x, box.max.y + 0.35, center.z] as [number, number, number] };
  }, [scene, hovered]);

  if (!info?.text) return null;

  return (
    <Html position={info.position} center zIndexRange={[15, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-full border border-cyan-300/60 bg-slate-950/85 px-3 py-1 text-xs font-medium text-cyan-100 shadow-lg backdrop-blur">
        {info.text} <span className="text-amber-300">· click</span>
      </div>
    </Html>
  );
}
