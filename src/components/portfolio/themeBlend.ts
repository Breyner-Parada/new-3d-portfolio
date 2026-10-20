/**
 * Shared 0..1 day→night blend, eased every frame by IslandEnvironment and read by
 * IslandScene (neon emissive boost). A plain object so per-frame code can read it
 * without React re-renders.
 */
export const themeBlend = { night: 0 };
