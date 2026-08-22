/** Server-side prompt experiment event store (in-memory; resets on deploy). */

export type PromptExperimentPayload = {
  experimentId: string;
  variant: string;
  action: "impression" | "click";
  starterId: string;
  areaId: string;
  at?: string;
};

export type PromptExperimentEvent = PromptExperimentPayload & {
  at: string;
};

const MAX_EVENTS = 2000;
const events: PromptExperimentEvent[] = [];

export const EXPERIMENT_DEFINITIONS = [
  {
    id: "local-jobs",
    name: "Local jobs prompt",
    description: "Wording for the jobs starter chip near the user's area",
    variants: [
      { id: "jobs-v1", label: 'Jobs in {place}', example: "Jobs in Milwaukee" },
      { id: "jobs-v2", label: "Show open jobs near {place} on the map", example: "Show open jobs near Milwaukee on the map" },
    ],
  },
  {
    id: "local-economy",
    name: "Local economy prompt",
    description: "Wording for unemployment / economy starter chip",
    variants: [
      { id: "econ-v1", label: "Unemployment in {place}", example: "Unemployment in Milwaukee" },
      { id: "econ-v2", label: "Map unemployment and wages in {place} County", example: "Map unemployment and wages in Milwaukee County" },
    ],
  },
] as const;

export function recordExperimentEvent(payload: PromptExperimentPayload): PromptExperimentEvent {
  const event: PromptExperimentEvent = {
    ...payload,
    at: payload.at ?? new Date().toISOString(),
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  return event;
}

export function getExperimentEvents(limit = 100): PromptExperimentEvent[] {
  return events.slice(-limit).reverse();
}

export type VariantStats = {
  experimentId: string;
  variant: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export type AreaStats = {
  areaId: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

export type StarterStats = {
  starterId: string;
  experimentId: string;
  variant: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

function ctr(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0;
}

export function aggregateExperimentStats() {
  const byVariant: Record<string, { experimentId: string; variant: string; impressions: number; clicks: number }> = {};
  const byArea: Record<string, { impressions: number; clicks: number }> = {};
  const byStarter: Record<string, StarterStats & { impressions: number; clicks: number }> = {};

  let totalImpressions = 0;
  let totalClicks = 0;

  for (const e of events) {
    const vKey = `${e.experimentId}:${e.variant}`;
    if (!byVariant[vKey]) {
      byVariant[vKey] = { experimentId: e.experimentId, variant: e.variant, impressions: 0, clicks: 0 };
    }
    if (!byArea[e.areaId]) byArea[e.areaId] = { impressions: 0, clicks: 0 };
    if (!byStarter[e.starterId]) {
      byStarter[e.starterId] = {
        starterId: e.starterId,
        experimentId: e.experimentId,
        variant: e.variant,
        impressions: 0,
        clicks: 0,
        ctr: 0,
      };
    }

    if (e.action === "impression") {
      byVariant[vKey].impressions++;
      byArea[e.areaId].impressions++;
      byStarter[e.starterId].impressions++;
      totalImpressions++;
    } else {
      byVariant[vKey].clicks++;
      byArea[e.areaId].clicks++;
      byStarter[e.starterId].clicks++;
      totalClicks++;
    }
  }

  const variants: VariantStats[] = Object.values(byVariant)
    .map((v) => ({
      ...v,
      ctr: ctr(v.clicks, v.impressions),
    }))
    .sort((a, b) => b.impressions - a.impressions);

  const areas: AreaStats[] = Object.entries(byArea)
    .map(([areaId, s]) => ({
      areaId,
      impressions: s.impressions,
      clicks: s.clicks,
      ctr: ctr(s.clicks, s.impressions),
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const starters: StarterStats[] = Object.values(byStarter)
    .map((s) => ({
      ...s,
      ctr: ctr(s.clicks, s.impressions),
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const winners: Record<string, string | null> = {};
  for (const def of EXPERIMENT_DEFINITIONS) {
    const rows = variants.filter((v) => v.experimentId === def.id && v.impressions >= 5);
    if (rows.length === 0) {
      winners[def.id] = null;
      continue;
    }
    const best = [...rows].sort((a, b) => b.ctr - a.ctr || b.clicks - a.clicks)[0];
    winners[def.id] = best.variant;
  }

  return {
    variants,
    areas,
    starters,
    winners,
    totalEvents: events.length,
    totalImpressions,
    totalClicks,
    overallCtr: ctr(totalClicks, totalImpressions),
  };
}

export function getExperimentDashboardPayload() {
  const stats = aggregateExperimentStats();
  return {
    definitions: EXPERIMENT_DEFINITIONS,
    stats,
    recentEvents: getExperimentEvents(50),
    generatedAt: new Date().toISOString(),
    storageNote: "Events are held in server memory and reset when the app redeploys or restarts.",
  };
}
