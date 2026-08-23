import { describe, expect, it } from "vitest";
import {
  feedsForCounty,
  googleNewsRssUrl,
  isBizDevelopmentStory,
  isBizStoryRelevantToArea,
  regionalBizGoogleRssUrl,
  scoreBizStoryForArea,
} from "@/lib/biz-journals";

const laCrosse = { displayName: "La Crosse", countyId: "la-crosse" };
const milwaukee = { displayName: "Milwaukee", countyId: "milwaukee" };

describe("feedsForCounty", () => {
  it("includes statewide feeds for every county", () => {
    const feeds = feedsForCounty("la-crosse");
    expect(feeds.some((f) => f.id === "wisbusiness")).toBe(true);
  });

  it("includes regional feeds for matching counties", () => {
    expect(feedsForCounty("milwaukee").some((f) => f.id === "biztimes")).toBe(true);
    expect(feedsForCounty("la-crosse").some((f) => f.id === "biz-la-crosse")).toBe(true);
  });

  it("excludes other metros' feeds", () => {
    const laCrosseFeeds = feedsForCounty("la-crosse");
    expect(laCrosseFeeds.some((f) => f.id === "biztimes")).toBe(false);
    expect(laCrosseFeeds.some((f) => f.id === "bizj-milwaukee")).toBe(false);
  });
});

describe("googleNewsRssUrl", () => {
  it("encodes query parameters", () => {
    const url = googleNewsRssUrl("La Crosse Wisconsin (jobs OR hiring)");
    expect(url).toContain("news.google.com/rss/search");
    expect(url).toContain(encodeURIComponent("La Crosse Wisconsin (jobs OR hiring)"));
  });
});

describe("regionalBizGoogleRssUrl", () => {
  it("includes the display name and Wisconsin", () => {
    const url = regionalBizGoogleRssUrl("La Crosse");
    expect(decodeURIComponent(url)).toMatch(/La Crosse Wisconsin/);
  });
});

describe("isBizDevelopmentStory", () => {
  it("detects expansion and workforce headlines", () => {
    expect(isBizDevelopmentStory("Company announces expansion in Wisconsin")).toBe(true);
    expect(isBizDevelopmentStory("Factory hiring 200 workers")).toBe(true);
    expect(isBizDevelopmentStory("City council approves park renovation")).toBe(false);
  });
});

describe("scoreBizStoryForArea", () => {
  it("ranks local development stories higher", () => {
    const local = scoreBizStoryForArea("La Crosse company expansion brings 100 jobs", laCrosse);
    const generic = scoreBizStoryForArea("Wisconsin economy grows", laCrosse);
    expect(local).toBeGreaterThan(generic);
  });
});

describe("isBizStoryRelevantToArea", () => {
  it("allows stories that mention the viewer's area", () => {
    expect(
      isBizStoryRelevantToArea("La Crosse hospital adds 50 jobs", laCrosse)
    ).toBe(true);
  });

  it("blocks Milwaukee-only headlines for La Crosse viewers", () => {
    expect(
      isBizStoryRelevantToArea(
        "Escapology Franchisee Signs on for Three-Unit Expansion Across the Milwaukee Market",
        laCrosse
      )
    ).toBe(false);
    expect(
      isBizStoryRelevantToArea("Quote/unQuote: What Milwaukee business leaders are saying", laCrosse)
    ).toBe(false);
  });

  it("allows statewide stories without another metro", () => {
    expect(isBizStoryRelevantToArea("Wisconsin adds manufacturing jobs statewide", laCrosse)).toBe(
      true
    );
  });

  it("allows Milwaukee headlines for Milwaukee viewers", () => {
    expect(
      isBizStoryRelevantToArea("Milwaukee Business Journal: downtown expansion", milwaukee)
    ).toBe(true);
  });
});
