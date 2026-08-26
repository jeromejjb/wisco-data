import { describe, expect, it } from "vitest";
import {
  alreadyLaunchedImplement,
  findingAlreadyFiled,
  implementPrompt,
  nextNightShiftFinding,
  nightShiftMarker,
} from "../../scripts/night-shift-lib.mjs";

const catalog = [
  {
    slug: "already-done",
    severity: "high",
    title: "Fix the dock contrast",
  },
  {
    slug: "next-up",
    severity: "medium",
    title: "Make skip links miss the logo",
  },
];

describe("nextNightShiftFinding", () => {
  it("skips findings that already have an issue", () => {
    const texts = [`${nightShiftMarker("already-done")}\nFix the dock contrast`];
    expect(nextNightShiftFinding(catalog, texts)?.slug).toBe("next-up");
  });

  it("returns null when the catalog is exhausted", () => {
    const texts = catalog.map((f) => `${nightShiftMarker(f.slug)}\n${f.title}`);
    expect(nextNightShiftFinding(catalog, texts)).toBeNull();
  });
});

describe("findingAlreadyFiled", () => {
  it("matches the hidden slug marker", () => {
    expect(
      findingAlreadyFiled(catalog[0], nightShiftMarker("already-done"))
    ).toBe(true);
  });
});

describe("alreadyLaunchedImplement", () => {
  it("skips issues that already have a running agent", () => {
    expect(
      alreadyLaunchedImplement("<!-- night-shift-agent:bc-123 -->\nStarted")
    ).toBe(true);
    expect(alreadyLaunchedImplement("no agent yet")).toBe(false);
  });
});

describe("implementPrompt", () => {
  it("forbids merge and names the issue", () => {
    const prompt = implementPrompt({
      number: 41,
      title: "Fix skip links",
      body: "Move them below the logo.",
      repo: "jeromejjb/wisco-data",
    });
    expect(prompt).toContain("#41");
    expect(prompt).toContain("Do not merge");
  });
});
