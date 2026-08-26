import { describe, expect, it } from "vitest";
import {
  CAROUSEL_LABEL_MAX,
  buildAreaChatStarters,
  defaultChatStarters,
  fitCarouselLabel,
  starterDisplayText,
} from "@/lib/agent/chat-starters";
import { DEFAULT_USER_AREA, userAreaFromCountyId } from "@/lib/user-area";

describe("fitCarouselLabel", () => {
  it("leaves short labels unchanged", () => {
    expect(fitCarouselLabel("Jobs in Milwaukee")).toBe("Jobs in Milwaukee");
  });

  it("never exceeds the carousel character limit", () => {
    const long = "Quote/unQuote: What Milwaukee and Wisconsin business leaders are saying";
    const fitted = fitCarouselLabel(long);
    expect(fitted.length).toBeLessThanOrEqual(CAROUSEL_LABEL_MAX);
    expect(fitted.endsWith("…")).toBe(true);
  });

  it("breaks on a word boundary when possible", () => {
    expect(fitCarouselLabel("Unemployment by county statewide")).toBe("Unemployment by county…");
  });
});

describe("starterDisplayText", () => {
  it("clamps labels and fallback text", () => {
    expect(
      starterDisplayText({
        id: "n",
        text: "What's the local impact of this news in Milwaukee? \"Quote/unQuote: What Milwaukee and Wisconsin business leaders are saying\"",
        label: "Quote/unQuote: What Milwaukee and Wisconsin business leaders are saying",
        kind: "news",
      }).length
    ).toBeLessThanOrEqual(CAROUSEL_LABEL_MAX);
  });
});

describe("buildAreaChatStarters", () => {
  it("keeps every carousel label within the character limit", () => {
    const area = userAreaFromCountyId("milwaukee");
    const starters = buildAreaChatStarters(area, {
      newsEnabled: true,
      newsItems: [
        {
          id: "story-1",
          title: "Quote/unQuote: What Milwaukee and Wisconsin business leaders are saying",
          source: "google-rss",
        },
      ],
      includeStatewide: true,
      sessionId: "test-session",
    });

    for (const starter of starters) {
      expect(starterDisplayText(starter).length).toBeLessThanOrEqual(CAROUSEL_LABEL_MAX);
    }
    expect(starters.some((s) => s.kind === "news" && s.label === "News · Milwaukee")).toBe(true);
  });

  it("uses short default starters", () => {
    for (const starter of defaultChatStarters()) {
      expect(starterDisplayText(starter).length).toBeLessThanOrEqual(CAROUSEL_LABEL_MAX);
    }
  });

  it("fits long county names", () => {
    const area = { ...DEFAULT_USER_AREA, displayName: "Fond du Lac", countyId: "fond-du-lac" };
    const starters = buildAreaChatStarters(area, {
      newsEnabled: true,
      newsItems: [{ id: "n", title: "A very long local headline about hiring", source: "google-rss" }],
      includeStatewide: true,
      sessionId: "test-session",
    });
    for (const starter of starters) {
      expect(starterDisplayText(starter).length).toBeLessThanOrEqual(CAROUSEL_LABEL_MAX);
    }
  });
});
