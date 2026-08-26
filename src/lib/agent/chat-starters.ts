import type { UserArea } from "@/lib/user-area";
import { pickVariant, type ExperimentVariant } from "./prompt-experiments";

export type {
  AreaNewsItem,
  AreaSentimentSnapshot,
  LocalNewsMapPin,
  NewsTopic,
  NewsTone,
} from "@/lib/news-types";
import type { AreaNewsItem } from "@/lib/news-types";

export type ChatStarter = {
  id: string;
  text: string;
  /** Shorter chip label; full `text` is still sent when clicked. */
  label?: string;
  kind: "economy" | "jobs" | "map" | "news" | "transit";
  experiment?: ExperimentVariant;
};

/** Max visible characters in the prompt carousel pill (fits the dock without clipping). */
export const CAROUSEL_LABEL_MAX = 26;

export function fitCarouselLabel(text: string, max = CAROUSEL_LABEL_MAX): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;

  const budget = max - 1;
  const slice = cleaned.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace >= 8 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

export function starterDisplayText(starter: ChatStarter): string {
  return fitCarouselLabel(starter.label ?? starter.text);
}

const JOBS_VARIANTS = ["jobs-v1", "jobs-v2"] as const;
const ECONOMY_VARIANTS = ["econ-v1", "econ-v2"] as const;

function jobsPrompt(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "jobs-v2") {
    return `Show open jobs near ${place} on the map`;
  }
  return `Jobs in ${place}`;
}

function jobsLabel(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "jobs-v2") return `Jobs near ${place}`;
  return `Jobs in ${place}`;
}

function economyPrompt(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "econ-v2") {
    return `Map unemployment and wages in ${place} County`;
  }
  return `Unemployment in ${place}`;
}

function economyLabel(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "econ-v2") return `Wages · ${place}`;
  return `Unemployment · ${place}`;
}

function newsPrompt(area: UserArea, item: AreaNewsItem): string {
  return `What's the local impact of this news in ${area.displayName}? "${item.title}"`;
}

export function buildAreaChatStarters(
  area: UserArea,
  opts: {
    newsEnabled: boolean;
    newsItems?: AreaNewsItem[];
    includeStatewide?: boolean;
    /** Pass null during SSR / pre-hydration so variant text matches server HTML. */
    sessionId?: string | null;
  }
): ChatStarter[] {
  const sessionId = opts.sessionId ?? null;
  const jobsExp = pickVariant("local-jobs", JOBS_VARIANTS, sessionId);
  const econExp = pickVariant("local-economy", ECONOMY_VARIANTS, sessionId);

  const starters: ChatStarter[] = [
    {
      id: `econ-${area.countyId}-${econExp.variant}`,
      text: economyPrompt(area, econExp.variant),
      label: economyLabel(area, econExp.variant),
      kind: "economy",
      experiment: econExp,
    },
    {
      id: `jobs-${area.countyId}-${jobsExp.variant}`,
      text: jobsPrompt(area, jobsExp.variant),
      label: jobsLabel(area, jobsExp.variant),
      kind: "jobs",
      experiment: jobsExp,
    },
    {
      id: `map-${area.countyId}`,
      text: `Fly to ${area.displayName} and show opportunity index`,
      label: `Opportunity · ${area.displayName}`,
      kind: "map",
    },
  ];

  if (opts.newsEnabled && opts.newsItems?.length) {
    const top = opts.newsItems[0];
    starters.push({
      id: `news-${top.id}`,
      text: newsPrompt(area, top),
      label: `News · ${area.displayName}`,
      kind: "news",
    });
  }

  if (opts.includeStatewide !== false && area.source !== "default") {
    starters.push({
      id: "statewide-choropleth",
      text: "Unemployment by county statewide",
      label: "Statewide unemployment",
      kind: "economy",
    });
  }

  return starters.slice(0, 5);
}

export function defaultChatStarters(): ChatStarter[] {
  return [
    { id: "default-unemployment", text: "Unemployment by county", kind: "economy" },
    { id: "default-jobs-mke", text: "Jobs in Milwaukee", kind: "jobs" },
    { id: "default-fly-madison", text: "Fly to Madison", kind: "map" },
  ];
}
