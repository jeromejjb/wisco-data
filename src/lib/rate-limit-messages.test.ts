import { describe, expect, it } from "vitest";
import {
  agentRateLimitCopy,
  formatRetryWindow,
  isRateLimitError,
  jobSourceRateLimitCopy,
  parseRetryAfterMinutes,
} from "@/lib/rate-limit-messages";
import { formatAgentError } from "@/lib/agent/format-agent-error";

describe("isRateLimitError", () => {
  it("detects common rate-limit signals", () => {
    expect(isRateLimitError("HTTP 429 too many requests")).toBe(true);
    expect(isRateLimitError("Rate limit exceeded")).toBe(true);
    expect(isRateLimitError("quota exceeded")).toBe(true);
    expect(isRateLimitError("network timeout")).toBe(false);
  });
});

describe("parseRetryAfterMinutes", () => {
  it("converts Retry-After seconds to minutes", () => {
    expect(parseRetryAfterMinutes("Retry-After: 120")).toBe(2);
    expect(parseRetryAfterMinutes("retry after 45")).toBe(1);
  });
});

describe("formatRetryWindow", () => {
  it("uses human-friendly windows", () => {
    expect(formatRetryWindow(1)).toBe("about a minute");
    expect(formatRetryWindow(5)).toBe("about 5 minutes");
    expect(formatRetryWindow(60)).toBe("about an hour");
  });
});

describe("agentRateLimitCopy", () => {
  it("includes timing guidance", () => {
    const copy = agentRateLimitCopy("429 Retry-After: 300");
    expect(copy.title).toMatch(/paused briefly/i);
    expect(copy.detail).toMatch(/about 5 minutes/i);
    expect(copy.detail).toMatch(/nothing is broken/i);
  });
});

describe("jobSourceRateLimitCopy", () => {
  it("explains the cooldown is temporary", () => {
    const copy = jobSourceRateLimitCopy("Adzuna");
    expect(copy.userMessage).toMatch(/briefly limiting/i);
    expect(copy.userMessage).toMatch(/about 5 minutes/i);
  });
});

describe("formatAgentError", () => {
  it("returns graceful rate-limit messaging", () => {
    const info = formatAgentError(new Error("429 rate limit exceeded"));
    expect(info.isRateLimited).toBe(true);
    expect(info.title).toMatch(/paused briefly/i);
    expect(info.detail).toMatch(/try again in about/i);
    expect(info.canUseLiveData).toBe(true);
  });
});
