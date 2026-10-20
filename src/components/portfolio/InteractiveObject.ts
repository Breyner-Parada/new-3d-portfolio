"use client";

import type { Object3D } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { islandNavigation } from "@/features/navigation/useIslandNavigation";
import { CONTACT_LINKS, ENGINEERING_TOPICS, PROJECTS, SKILL_CATEGORIES, ZONE_BY_ID } from "@/features/projects/projectData";
import type { Selection, ZoneId } from "@/types/portfolio";

/**
 * Walks up from the hit mesh and returns the OUTERMOST node with `interactive: true`
 * in its glTF extras, so a station highlights as a whole (not just its screen).
 */
export function findInteractive(object: Object3D | null): Object3D | null {
  let found: Object3D | null = null;
  for (let o = object; o; o = o.parent) {
    if (o.userData?.interactive) found = o;
  }
  return found;
}

export function selectionFrom(object: Object3D): Selection {
  const { zone, role, project, category, link } = object.userData as Record<string, string | undefined>;
  return { zone: zone as ZoneId, role, project, category, link };
}

const ROLE_LABELS: Record<string, string> = {
  about: "About me",
  cv: "CV & experience",
  landmark: "Base Camp",
  overview: "All skills",
  contact: "Contact",
};

/** Human label shown in the hover tooltip, derived from the same extras that drive the panels. */
export function labelFor(object: Object3D): string {
  const s = selectionFrom(object);
  if (s.project) return PROJECTS.find((p) => p.slug === s.project)?.name ?? s.project;
  if (s.category) return SKILL_CATEGORIES.find((c) => c.id === s.category)?.name ?? s.category;
  if (s.link) return CONTACT_LINKS.find((l) => l.id === s.link)?.label ?? s.link;
  if (s.zone === "systems-lab" && s.role) return ENGINEERING_TOPICS.find((t) => t.role === s.role)?.title ?? ZONE_BY_ID[s.zone].label;
  if (s.role && ROLE_LABELS[s.role]) return ROLE_LABELS[s.role];
  return ZONE_BY_ID[s.zone]?.label ?? "";
}

function setHover(name: string | null) {
  islandNavigation.setHovered(name);
  document.body.style.cursor = name ? "pointer" : "";
}

/**
 * Pointer handlers for the island: hover state + cursor, click focuses the zone.
 * The handlers sit on the scene root, and R3F only fires pointerover/out when the pointer
 * enters/leaves that whole root — not when it moves between meshes inside it. So hover is
 * resolved on every pointermove from the nearest hit instead.
 */
export const interactiveHandlers = {
  onPointerMove(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation(); // first call = nearest intersection; ignore the objects behind it
    setHover(findInteractive(e.object)?.name ?? null);
  },
  onPointerOut() {
    setHover(null);
  },
  onClick(e: ThreeEvent<MouseEvent>) {
    const target = findInteractive(e.object);
    if (!target) return;
    e.stopPropagation();
    const selection = selectionFrom(target);
    islandNavigation.focusZone(selection.zone, selection);
  },
};
