"use client";

import { useMemo } from "react";
import { Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import type { CameraView, Vec3, ZoneId } from "@/types/portfolio";

/** Camera views of the new island (NAV collection of island-assets/new-island.blend). */
export const NAV_MODEL = "/models/island-nav-new.glb";

export type ViewId = ZoneId | "overview";

const VIEW_IDS: ViewId[] = ["overview", "base-camp", "project-outpost", "skill-crystals", "systems-lab", "contact-portal"];

/** Used only if a node is missing from island-nav.glb, so the scene never breaks. */
const FALLBACK: CameraView = { position: [27, 33, 55], target: [0, 1.5, 7] };

/**
 * Reads the camera pairs authored in Blender (EMPTY_Cam_<zone> / EMPTY_Target_<zone>).
 * The glTF exporter already converted them to three.js Y-up coordinates.
 */
export function useCameraViews(): Record<ViewId, CameraView> {
  const { scene } = useGLTF(NAV_MODEL);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const read = (name: string): Vec3 | null => {
      const node = scene.getObjectByName(name);
      if (!node) return null;
      const p = node.getWorldPosition(new Vector3());
      return [p.x, p.y, p.z];
    };
    const views = {} as Record<ViewId, CameraView>;
    for (const id of VIEW_IDS) {
      const position = read(`EMPTY_Cam_${id}`);
      const target = read(`EMPTY_Target_${id}`);
      views[id] = position && target ? { position, target } : FALLBACK;
    }
    return views;
  }, [scene]);
}

useGLTF.preload(NAV_MODEL);
