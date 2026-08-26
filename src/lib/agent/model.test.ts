import { afterEach, describe, expect, it } from "vitest";
import {
  clearModelCooldowns,
  cooldownUntilFromFailure,
  failureCooldownFromRaw,
  getAgentModelCandidates,
  isModelCooling,
  markModelCooldown,
  resolveAgentModelFallback,
} from "@/lib/agent/model";

const saved = {
  google: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gateway: process.env.AI_GATEWAY_API_KEY,
  provider: process.env.AGENT_PROVIDER,
  model: process.env.AGENT_MODEL,
  free: process.env.AGENT_FREE_MODEL,
};

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  clearModelCooldowns();
  restoreEnv("GOOGLE_GENERATIVE_AI_API_KEY", saved.google);
  restoreEnv("GEMINI_API_KEY", saved.gemini);
  restoreEnv("OPENAI_API_KEY", saved.openai);
  restoreEnv("AI_GATEWAY_API_KEY", saved.gateway);
  restoreEnv("AGENT_PROVIDER", saved.provider);
  restoreEnv("AGENT_MODEL", saved.model);
  restoreEnv("AGENT_FREE_MODEL", saved.free);
});

describe("failureCooldownFromRaw", () => {
  it("cools daily quota until the next UTC midnight", () => {
    const now = Date.UTC(2026, 7, 25, 22, 0, 0);
    const until = failureCooldownFromRaw("You exceeded your current quota: free_tier_requests per day", now);
    expect(until).toBe(Date.UTC(2026, 7, 26, 0, 0, 5));
  });

  it("cools 429s using retry-after, capped at 30 minutes", () => {
    const now = 1_000_000;
    expect(failureCooldownFromRaw("429 Please retry in 48.72s", now)).toBe(now + 60_000);
    expect(failureCooldownFromRaw("RESOURCE_EXHAUSTED retry-after: 3600", now)).toBe(now + 30 * 60_000);
  });

  it("ignores unrelated failures", () => {
    expect(failureCooldownFromRaw("network timeout")).toBeNull();
  });
});

describe("cooldownUntilFromFailure", () => {
  it("defaults short rate limits to five minutes", () => {
    const now = 5_000;
    expect(cooldownUntilFromFailure("429 too many requests", now)).toBe(now + 5 * 60_000);
  });
});

describe("resolveAgentModelFallback", () => {
  it("skips a cooling primary and uses the free lite model", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.AGENT_PROVIDER = "google";
    process.env.AGENT_MODEL = "gemini-2.5-flash";
    delete process.env.OPENAI_API_KEY;
    delete process.env.AGENT_FREE_MODEL;

    markModelCooldown("gemini-2.5-flash", Date.now() + 60_000);

    const chosen = resolveAgentModelFallback();
    expect(chosen.modelId).toBe("gemini-2.5-flash-lite");
    expect(isModelCooling("gemini-2.5-flash")).toBe(true);
  });

  it("lists lite models after the primary", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
    process.env.AGENT_PROVIDER = "google";
    process.env.AGENT_MODEL = "gemini-2.5-flash";
    delete process.env.OPENAI_API_KEY;
    delete process.env.AGENT_FREE_MODEL;

    const ids = getAgentModelCandidates().map((c) => c.modelId);
    expect(ids[0]).toBe("gemini-2.5-flash");
    expect(ids).toContain("gemini-2.5-flash-lite");
    expect(ids).toContain("gemini-2.0-flash-lite");
  });
});
