"use client";

import type { Object3D } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { islandNavigation } from "@/features/navigation/useIslandNavigation";
import type { Selection, ZoneId } from "@/types/portfolio";

/** Walks up from the hit mesh to the node that carries `interactive: true` in its glTF extras. */
export function findInteractive(object: Object3D | null): Object3D | null {
  for (let o = object; o; o = o.parent) {
    if (o.userData?.interactive) return o;
  }
  return null;
}

export function selectionFrom(object: Object3D): Selection {
  const { zone, role, project, category, link } = object.userData as Record<string, string | undefined>;
  return { zone: zone as ZoneId, role, project, category, link };
}

/** Pointer handlers for the island: hover label + cursor, click focuses the zone. */
export const interactiveHandlers = {
  onPointerOver(e: ThreeEvent<PointerEvent>) {
    const target = findInteractive(e.object);
    if (!target) return;
    e.stopPropagation();
    islandNavigation.setHovered(target.name);
    document.body.style.cursor = "pointer";
  },
  onPointerOut(e: ThreeEvent<PointerEvent>) {
    if (!findInteractive(e.object)) return;
    islandNavigation.setHovered(null);
    document.body.style.cursor = "";
  },
  onClick(e: ThreeEvent<MouseEvent>) {
    const target = findInteractive(e.object);
    if (!target) return;
    e.stopPropagation();
    const selection = selectionFrom(target);
    islandNavigation.focusZone(selection.zone, selection);
  },
};
