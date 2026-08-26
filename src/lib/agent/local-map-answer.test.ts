import { describe, expect, it } from "vitest";
import { resolvePromptNewsStories, titlesOverlap } from "@/lib/agent/local-map-answer";
import type { AreaNewsItem } from "@/lib/news-types";

const story = (title: string, id = title): AreaNewsItem => ({
  id,
  title,
  source: "google-rss",
  summary: `Summary of ${title}`,
});

describe("resolvePromptNewsStories", () => {
  it("surfaces the quoted prompt headline even when the feed has no match", () => {
    const stories = resolvePromptNewsStories({
      quotedHeadline: "School board votes on new hiring plan",
      fetched: [story("Unrelated warehouse expansion")],
      place: "Dane",
    });
    expect(stories[0]?.title).toBe("School board votes on new hiring plan");
    expect(stories[0]?.summary).toMatch(/Dane/);
    expect(stories.some((s) => s.title.includes("warehouse"))).toBe(true);
  });

  it("promotes a matching seeded carousel story first", () => {
    const quoted = "Plant expansion downtown";
    const stories = resolvePromptNewsStories({
      quotedHeadline: quoted,
      fetched: [story("Other local brief")],
      seed: [story(quoted, "seed-1")],
      place: "Milwaukee",
    });
    expect(stories[0]?.id).toBe("seed-1");
    expect(stories[0]?.summary).toBe("Summary of Plant expansion downtown");
  });
});

describe("titlesOverlap", () => {
  it("matches truncated quotes to full headlines", () => {
    expect(
      titlesOverlap(
        "School board votes on new hiring plan for fall",
        "School board votes on new hiring plan"
      )
    ).toBe(true);
  });
});
