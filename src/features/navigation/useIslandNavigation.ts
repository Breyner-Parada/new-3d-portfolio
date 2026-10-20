"use client";

import { useSyncExternalStore } from "react";
import type { Selection, ZoneId } from "@/types/portfolio";

/**
 * Tiny shared store for island navigation. It lives outside React so the
 * R3F scene (inside <Canvas>) and the HTML UI read the same state.
 */
interface NavigationState {
  /** Zone the camera is focused on; null = overview. */
  zone: ZoneId | null;
  /** Object the visitor selected inside the zone (drives the panel). */
  selection: Selection | null;
  /** Name of the interactive object under the pointer. */
  hovered: string | null;
  /** True while GSAP is moving the camera. */
  transitioning: boolean;
}

let state: NavigationState = { zone: null, selection: null, hovered: null, transitioning: false };
const listeners = new Set<() => void>();

function setState(partial: Partial<NavigationState>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export const islandNavigation = {
  focusZone(zone: ZoneId, selection: Selection | null = null) {
    setState({ zone, selection: selection ?? { zone } });
  },
  backToOverview() {
    setState({ zone: null, selection: null });
  },
  setHovered(hovered: string | null) {
    if (hovered !== state.hovered) setState({ hovered });
  },
  setTransitioning(transitioning: boolean) {
    setState({ transitioning });
  },
};

export function useIslandNavigation() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
