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
  kind: "economy" | "jobs" | "map" | "news" | "transit";
  experiment?: ExperimentVariant;
};

const JOBS_VARIANTS = ["jobs-v1", "jobs-v2"] as const;
const ECONOMY_VARIANTS = ["econ-v1", "econ-v2"] as const;

function jobsPrompt(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "jobs-v2") {
    return `Show open jobs near ${place} on the map`;
  }
  return `Jobs in ${place}`;
}

function economyPrompt(area: UserArea, variant: string): string {
  const place = area.displayName;
  if (variant === "econ-v2") {
    return `Map unemployment and wages in ${place} County`;
  }
  return `Unemployment in ${place}`;
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
  }
): ChatStarter[] {
  const jobsExp = pickVariant("local-jobs", [...JOBS_VARIANTS]);
  const econExp = pickVariant("local-economy", [...ECONOMY_VARIANTS]);

  const starters: ChatStarter[] = [
    {
      id: `econ-${area.countyId}-${econExp.variant}`,
      text: economyPrompt(area, econExp.variant),
      kind: "economy",
      experiment: econExp,
    },
    {
      id: `jobs-${area.countyId}-${jobsExp.variant}`,
      text: jobsPrompt(area, jobsExp.variant),
      kind: "jobs",
      experiment: jobsExp,
    },
    {
      id: `map-${area.countyId}`,
      text: `Fly to ${area.displayName} and show opportunity index`,
      kind: "map",
    },
  ];

  if (opts.newsEnabled && opts.newsItems?.length) {
    const top = opts.newsItems[0];
    starters.push({
      id: `news-${top.id}`,
      text: newsPrompt(area, top),
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
