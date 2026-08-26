import { generateObject } from "ai";
import { z } from "zod";
import { cached } from "@/lib/cache";
import { hasAgentCredentials, resolveAgentLanguageModel } from "@/lib/agent/model";
import type { AreaNewsItem, AreaSentimentSnapshot, NewsTone } from "@/lib/news-types";
import type { UserArea } from "@/lib/user-area";

const SentimentSchema = z.object({
  vibe: z.string().max(36),
  score: z.number().min(-1).max(1),
  tone: z.enum(["upbeat", "mixed", "cautious", "concerned"]),
  oneLiner: z.string().max(100),
  topics: z.array(z.string()).max(4),
});

function heuristicSentiment(area: UserArea, items: AreaNewsItem[]): AreaSentimentSnapshot {
  const blob = items.map((i) => `${i.title} ${i.summary ?? ""}`).join(" ").toLowerCase();
  let score = 0;
  if (/\b(hir(e|ing)|growth|expand|award|grant|opens|record)\b/.test(blob)) score += 0.35;
  if (/\b(layoff|cut|crisis|crime|strike|shortage|deficit|closure)\b/.test(blob)) score -= 0.35;
  if (/\b(budget|debate|mixed|uncertain|caution)\b/.test(blob)) score *= 0.6;

  score = Math.max(-1, Math.min(1, score));

  const tone: NewsTone =
    score >= 0.35 ? "upbeat" : score <= -0.35 ? "concerned" : score >= 0.1 ? "mixed" : score <= -0.1 ? "cautious" : "mixed";

  const vibes: Record<NewsTone, string> = {
    upbeat: "Mostly positive headlines",
    mixed: "Mixed headlines",
    cautious: "Some caution in the news",
    concerned: "Challenging headlines",
  };

  const topics = [...new Set(items.map((i) => i.topic).filter(Boolean))].slice(0, 3) as string[];

  const topTitle = items[0]?.title?.replace(/\s+/g, " ").trim();

  return {
    vibe: vibes[tone],
    score,
    tone,
    oneLiner: topTitle
      ? `Recent stories include: “${topTitle.length > 72 ? `${topTitle.slice(0, 71)}…` : topTitle}”`
      : tone === "upbeat"
        ? "Recent coverage highlights hiring and growth."
        : tone === "concerned"
          ? "Recent coverage mentions layoffs, cuts, or local stress points."
          : "Recent headlines cover both opportunities and open questions.",
    topics: topics.length ? topics : ["local"],
    areaName: area.displayName,
    source: "heuristic",
  };
}

export async function analyzeAreaSentiment(
  area: UserArea,
  items: AreaNewsItem[]
): Promise<AreaSentimentSnapshot> {
  const cacheKey = `news-sentiment:${area.countyId}:${items.map((i) => i.id).join(",")}`;
  return cached(cacheKey, 30 * 60 * 1000, async () => {
    if (!hasAgentCredentials()) {
      return heuristicSentiment(area, items);
    }

    try {
      const headlines = items
        .slice(0, 6)
        .map((i, n) => `${n + 1}. ${i.title}${i.summary ? ` — ${i.summary.slice(0, 100)}` : ""}`)
        .join("\n");

      const { object } = await generateObject({
        model: resolveAgentLanguageModel(),
        maxRetries: 0,
        schema: SentimentSchema,
        prompt: `You analyze local news sentiment for Wisconsin workforce/economy context.

Area: ${area.displayName}, Wisconsin (${area.countyName} County)

Headlines:
${headlines}

Return JSON only. vibe = 2-4 word mood label (cool, human, not corporate). oneLiner = single concise sentence about how the area feels from these headlines. score from -1 (bad) to 1 (good). topics = short tags like jobs, budget, transit.`,
      });

      return {
        ...object,
        areaName: area.displayName,
        source: "gemini",
      };
    } catch (err) {
      console.warn("News sentiment AI failed:", err);
      return heuristicSentiment(area, items);
    }
  });
}
