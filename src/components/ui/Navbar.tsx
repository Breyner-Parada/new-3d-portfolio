"use client";

import { ZONES } from "@/features/projects/projectData";
import { islandNavigation, useIslandNavigation } from "@/features/navigation/useIslandNavigation";
import { ThemeToggle } from "./ThemeToggle";

/** Zone menu: lets visitors navigate without touching the 3D scene (a top bar, scrolling sideways on phones). */
export function Navbar() {
  const { zone } = useIslandNavigation();

  return (
    <nav
      aria-label="Island zones"
      className="pointer-events-auto fixed inset-x-0 top-0 z-20 flex gap-2 overflow-x-auto px-4 py-3 md:justify-center"
    >
      <button
        type="button"
        onClick={() => islandNavigation.backToOverview()}
        aria-pressed={zone === null}
        className="nav-chip"
      >
        Island
      </button>
      {ZONES.map((z) => (
        <button
          key={z.id}
          type="button"
          onClick={() => islandNavigation.focusZone(z.id)}
          aria-pressed={zone === z.id}
          className="nav-chip"
        >
          {z.label}
        </button>
      ))}
      <ThemeToggle />
    </nav>
  );
}
