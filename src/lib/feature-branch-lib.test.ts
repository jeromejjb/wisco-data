import { describe, expect, it } from "vitest";
import { branchName, issueNumberFromBranch, prAlreadyExistsUrl, prBody, prTitleFromSubjects, shouldStartFeature, slugify } from "../../scripts/feature-branch-lib.mjs";

describe("slugify", () => {
  it("builds a short git-safe slug", () => {
    expect(slugify("News feeds follow the searched market!")).toBe(
      "news-feeds-follow-the-searched-market"
    );
  });

  it("falls back when the title has no useful characters", () => {
    expect(slugify("???")).toBe("feature");
  });
});

describe("branchName", () => {
  it("prefixes the issue number", () => {
    expect(branchName(12, "Rate-limit copy")).toBe("issue/12-rate-limit-copy");
  });
});

describe("shouldStartFeature", () => {
  it("accepts open feature issues", () => {
    expect(
      shouldStartFeature({ state: "open", labels: [{ name: "feature" }] })
    ).toEqual({ ok: true });
  });

  it("skips automated digest issues", () => {
    expect(
      shouldStartFeature({
        state: "open",
        labels: ["feature", "automated"],
      })
    ).toMatchObject({ ok: false });
  });

  it("requires a feature or enhancement label", () => {
    expect(shouldStartFeature({ state: "open", labels: ["bug"] })).toMatchObject({
      ok: false,
    });
  });
});

describe("prBody", () => {
  it("targets main via Closes and includes a test plan", () => {
    const body = prBody(4, "Unify the county panel.");
    expect(body).toContain("Closes #4");
    expect(body).toContain("Unify the county panel.");
    expect(body).toContain("## Test plan");
  });

  it("uses Related when the issue is already closed", () => {
    expect(prBody(4, "Follow-up.", { issueOpen: false })).toContain("Related to #4");
  });
});

describe("issueNumberFromBranch", () => {
  it("reads the issue number from GitHub Flow branch names", () => {
    expect(issueNumberFromBranch("issue/12-rate-limit-copy")).toBe(12);
    expect(issueNumberFromBranch("issue/38")).toBe(38);
    expect(issueNumberFromBranch("main")).toBeNull();
  });
});

describe("prTitleFromSubjects", () => {
  it("skips the empty Start commit", () => {
    expect(
      prTitleFromSubjects(
        ["Make the job sheet scroll", "Start #14: audit high fixes"],
        "issue/14-audit"
      )
    ).toBe("Make the job sheet scroll");
  });
});

describe("prAlreadyExistsUrl", () => {
  it("reads the existing PR URL from gh stderr", () => {
    const stderr =
      'a pull request for branch "issue/auto-open-prs" into branch "main" already exists:\nhttps://github.com/jeromejjb/wisco-data/pull/40\n';
    expect(prAlreadyExistsUrl(stderr)).toBe(
      "https://github.com/jeromejjb/wisco-data/pull/40"
    );
  });
});
