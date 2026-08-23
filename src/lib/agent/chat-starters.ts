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

export function starterDisplayText(starter: ChatStarter): string {
  return starter.label ?? starter.text;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
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
  if (variant === "jobs-v2") return `Open jobs near ${place}`;
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
      label: truncateText(top.title, 52),
      kind: "news",
    });
  }

  if (opts.includeStatewide !== false && area.source !== "default") {
    starters.push({
      id: "statewide-choropleth",
      text: "Unemployment by county statewide",
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
