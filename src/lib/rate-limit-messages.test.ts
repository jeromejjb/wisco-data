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
    expect(isRateLimitError("RESOURCE_EXHAUSTED")).toBe(true);
    expect(isRateLimitError("insufficient_quota")).toBe(true);
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
    expect(copy.title).toMatch(/quick breath/i);
    expect(copy.detail).toMatch(/about 5 minutes/i);
    expect(copy.detail).toMatch(/recharge on their own/i);
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
    expect(info.title).toMatch(/quick breath/i);
    expect(info.detail).toMatch(/back in about/i);
    expect(info.canUseLiveData).toBe(true);
  });

  it("points at the map, not 'below', when live data answered", () => {
    const info = formatAgentError(new Error("agent-error:unavailable"), { liveFallback: true });
    expect(info.title).toMatch(/on the map/i);
    expect(info.fallbackNote).toMatch(/on the map/i);
    expect(info.fallbackNote).not.toMatch(/below/i);
    expect(info.detail).not.toMatch(/below/i);
  });
});
