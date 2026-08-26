/**
 * Motion tokens aligned with Material 3 (standard scheme, not expressive bounce)
 * and WCAG 2.3.3 / 2.2.2: spatial motion is short, effects fade without travel,
 * and callers must honor prefers-reduced-motion.
 *
 * Spatial (position/scale): ~200–400ms. Effects (opacity/color): ~50–200ms.
 * Never exceed ~600ms for UI chrome. Map camera may go slightly longer.
 */

export const spatialSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 36,
  mass: 0.85,
};

export const overlaySpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

/** Emphasized decelerate — Material 3 standard easing for entering surfaces. */
export const emphasizedDecelerate = [0.05, 0.7, 0.1, 1] as const;

export const effectsFade = {
  duration: 0.2,
  ease: emphasizedDecelerate,
};

export const microTap = {
  type: "spring" as const,
  stiffness: 520,
  damping: 38,
};

export function overlayEnter(reduced: boolean | null) {
  if (reduced) return { opacity: 1, y: 0, scale: 1, filter: "none" };
  return { opacity: 1, y: 0, scale: 1 };
}

export function overlayHidden(reduced: boolean | null) {
  if (reduced) return { opacity: 0, y: 0, scale: 1 };
  return { opacity: 0, y: 12, scale: 0.985 };
}

/** MapLibre flyTo duration. `essential: true` must never be used — it ignores reduced motion. */
export function mapFlyDurationMs(reduced: boolean, immersive: boolean): number {
  if (reduced) return 0;
  return immersive ? 550 : 800;
}
