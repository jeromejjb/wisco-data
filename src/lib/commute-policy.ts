/**
 * Commute recommendation policy aligned with public-health research.
 * Studies consistently associate one-way commutes over ~45–60 minutes with
 * higher stress, lower wellbeing, and elevated cardiovascular risk.
 * We cap recommendations at 45 minutes unless the user widens filters explicitly.
 */
export const COMMUTE_POLICY = {
  /** Ideal one-way commute (≤30 min) */
  idealMaxMinutes: 30,
  /** Maximum we recommend by default (≤45 min) */
  recommendedMaxMinutes: 45,
  /** Max straight-line search radius from requested city (km) */
  searchRadiusKm: 40,
  /** Research note shown in UI */
  researchNote:
    "We only surface roles within a 45-minute one-way commute — research links longer daily travel to higher stress and poorer wellbeing.",
} as const;

export type CommuteHealthTier = "excellent" | "good" | "unhealthy";

export function classifyCommute(minutes: number): CommuteHealthTier {
  if (minutes <= COMMUTE_POLICY.idealMaxMinutes) return "excellent";
  if (minutes <= COMMUTE_POLICY.recommendedMaxMinutes) return "good";
  return "unhealthy";
}

export function isRecommendableCommute(minutes: number, maxMinutes: number = COMMUTE_POLICY.recommendedMaxMinutes): boolean {
  return minutes <= maxMinutes;
}

export function commuteHealthLabel(tier: CommuteHealthTier): string {
  switch (tier) {
    case "excellent":
      return "Healthy commute";
    case "good":
      return "Within research-backed limit";
    case "unhealthy":
      return "Too far — not recommended";
  }
}

export function commuteHealthColors(tier: CommuteHealthTier): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (tier) {
    case "excellent":
      return { bg: "bg-emerald-400/15", text: "text-emerald-200", ring: "ring-emerald-400/30" };
    case "good":
      return { bg: "bg-amber-400/12", text: "text-amber-100", ring: "ring-amber-400/25" };
    case "unhealthy":
      return { bg: "bg-rose-400/12", text: "text-rose-200", ring: "ring-rose-400/25" };
  }
}

export function resolveJobSearchMaxCommute(intent?: {
  maxCommute?: number;
  transitOnly?: boolean;
}): number {
  if (intent?.maxCommute != null) return intent.maxCommute;
  return COMMUTE_POLICY.recommendedMaxMinutes;
}

/** Rough drive minutes from straight-line km (urban/suburban average). */
export function driveMinutesFromKm(km: number): number {
  return Math.round(Math.max(8, km * 1.4 + 4));
}
