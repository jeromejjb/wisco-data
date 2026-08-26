/**
 * Motion tokens aligned with Material 3 (standard scheme, not expressive bounce)
 * and WCAG 2.3.3 / 2.2.2: spatial motion is short, effects fade without travel,
 * and callers must honor prefers-reduced-motion.
 *
 * Spatial (position/scale): ~150–280ms. Effects (opacity/color): ~50–150ms.
 * Never exceed ~450ms for UI chrome. Map camera stays in that same window.
 */

export const spatialSpring = {
  type: "spring" as const,
  stiffness: 560,
  damping: 40,
  mass: 0.72,
};

export const overlaySpring = {
  type: "spring" as const,
  stiffness: 620,
  damping: 42,
  mass: 0.68,
};

/** Emphasized decelerate — Material 3 standard easing for entering surfaces. */
export const emphasizedDecelerate = [0.05, 0.7, 0.1, 1] as const;

export const effectsFade = {
  duration: 0.12,
  ease: emphasizedDecelerate,
};

/** Prompt carousel / chip slides — short tween so wait-mode doesn't feel sticky. */
export const promptSlide = {
  duration: 0.14,
  ease: emphasizedDecelerate,
};

export const microTap = {
  type: "spring" as const,
  stiffness: 720,
  damping: 38,
};

/** MapLibre paint property transition (ms) for county highlight / fills. */
export const mapPaintTransition = { duration: 80, delay: 0 };

export function overlayEnter(reduced: boolean | null) {
  if (reduced) return { opacity: 1, y: 0, scale: 1, filter: "none" };
  return { opacity: 1, y: 0, scale: 1 };
}

export function overlayHidden(reduced: boolean | null) {
  if (reduced) return { opacity: 0, y: 0, scale: 1 };
  return { opacity: 0, y: 6, scale: 0.992 };
}

/** MapLibre flyTo duration. `essential: true` must never be used — it ignores reduced motion. */
export function mapFlyDurationMs(reduced: boolean, immersive: boolean): number {
  if (reduced) return 0;
  return immersive ? 280 : 360;
}
