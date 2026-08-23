/** A/B prompt variants — impressions & clicks stored client-side for tuning. */

export type PromptExperimentEvent = {
  experimentId: string;
  variant: string;
  action: "impression" | "click";
  starterId: string;
  areaId: string;
  at: string;
};

const STORAGE_KEY = "workways-prompt-experiments";
const MAX_EVENTS = 200;

export type ExperimentVariant = {
  experimentId: string;
  variant: string;
};

/** Stable variant pick per session + experiment (50/50 style). */
export function pickVariant(
  experimentId: string,
  variants: readonly string[],
  sessionId: string | null
): ExperimentVariant {
  if (!sessionId) {
    return { experimentId, variant: variants[0]! };
  }

  const hash = [...`${experimentId}:${sessionId}`].reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );
  const variant = variants[hash % variants.length]!;
  return { experimentId, variant };
}

/** Client-only session id for experiment bucketing. Call after mount. */
export function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem("workways-session-id");
  if (existing) return existing;
  const id = crypto.randomUUID().slice(0, 8);
  sessionStorage.setItem("workways-session-id", id);
  return id;
}

export function logPromptExperiment(event: Omit<PromptExperimentEvent, "at">) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: PromptExperimentEvent[] = raw ? JSON.parse(raw) : [];
    list.push({ ...event, at: new Date().toISOString() });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list.slice(-MAX_EVENTS))
    );
  } catch {
    /* ignore quota */
  }
}

export function getPromptExperimentStats(): Record<
  string,
  { impressions: number; clicks: number }
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: PromptExperimentEvent[] = raw ? JSON.parse(raw) : [];
    const stats: Record<string, { impressions: number; clicks: number }> = {};
    for (const e of list) {
      const key = `${e.experimentId}:${e.variant}`;
      if (!stats[key]) stats[key] = { impressions: 0, clicks: 0 };
      if (e.action === "impression") stats[key].impressions++;
      else stats[key].clicks++;
    }
    return stats;
  } catch {
    return {};
  }
}
