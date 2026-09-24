export type MapDensity = "detailed" | "auto" | "simple";

export const AUTO_DENSITY_SIMPLE_THRESHOLD = 0.75;

/** Resolves a density setting and zoom scale into a single `'detailed' | 'simple'` rendering
 *  hint: `'detailed'` always detailed, `'simple'` always simple, `'auto'` delegates to the
 *  `AUTO_DENSITY_SIMPLE_THRESHOLD` scale cutoff. */
export function resolveMapDensity(density: MapDensity, scale: number): "detailed" | "simple" {
  if (density === "detailed") return "detailed";
  if (density === "simple") return "simple";
  return scale < AUTO_DENSITY_SIMPLE_THRESHOLD ? "simple" : "detailed";
}
