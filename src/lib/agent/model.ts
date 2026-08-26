import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { wrapLanguageModel, type LanguageModel, type LanguageModelMiddleware } from "ai";
import { isDailyQuotaError, isRateLimitError } from "@/lib/rate-limit-messages";

export type AgentProvider = "google" | "openai" | "gateway";

export type AgentModelCandidate = {
  model: LanguageModel;
  provider: AgentProvider;
  modelId: string;
};

/** Free Gemini models with separate quota buckets — lite first so failover stays fast. */
export const FREE_GOOGLE_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
] as const;

export function resolveAgentModel(): AgentModelCandidate {
  const googleKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const preferred = process.env.AGENT_PROVIDER?.trim().toLowerCase();
  const modelOverride = process.env.AGENT_MODEL?.trim();

  if ((preferred === "google" || !preferred) && googleKey) {
    const modelId = modelOverride || "gemini-2.5-flash";
    return { model: google(modelId), provider: "google", modelId };
  }

  if (openaiKey) {
    const modelId = modelOverride || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return { model: openai(modelId), provider: "openai", modelId };
  }

  if (googleKey) {
    const modelId = modelOverride || "gemini-2.5-flash";
    return { model: google(modelId), provider: "google", modelId };
  }

  // Vercel AI Gateway fallback (requires AI_GATEWAY_API_KEY)
  const gatewayModel = modelOverride || "google/gemini-2.5-flash";
  return { model: gatewayModel, provider: "gateway", modelId: gatewayModel };
}

export function hasAgentCredentials(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.AI_GATEWAY_API_KEY?.trim()
  );
}

const cooldowns = new Map<string, number>();

export function markModelCooldown(modelId: string, untilEpochMs: number): void {
  cooldowns.set(modelId, untilEpochMs);
}

export function clearModelCooldowns(): void {
  cooldowns.clear();
}

export function isModelCooling(modelId: string, now = Date.now()): boolean {
  const until = cooldowns.get(modelId);
  if (until === undefined) return false;
  if (until <= now) {
    cooldowns.delete(modelId);
    return false;
  }
  return true;
}

export function rawErrorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const status =
      "statusCode" in error && typeof error.statusCode === "number" ? String(error.statusCode) : "";
    return `${error.name} ${error.message} ${status}`.trim();
  }
  return String(error);
}

/** Rate-limit → cooldown for the retry window (capped); daily quota → until midnight UTC. */
export function cooldownUntilFromFailure(rawMessage: string, now = Date.now()): number {
  if (isDailyQuotaError(rawMessage)) {
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 5, 0);
    return tomorrow.getTime();
  }
  const match =
    rawMessage.match(/retry[- ]after[:\s]+(\d+(?:\.\d+)?)/i) ??
    rawMessage.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  const seconds = match ? Number.parseFloat(match[1]!) : NaN;
  const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds / 60) : 5;
  return now + Math.min(minutes, 30) * 60_000;
}

/** Classifies a raw upstream failure; returns cooldown timestamp when applicable. */
export function failureCooldownFromRaw(raw: string, now = Date.now()): number | null {
  if (isDailyQuotaError(raw) || isRateLimitError(raw)) {
    return cooldownUntilFromFailure(raw, now);
  }
  return null;
}

function googleCreds(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()
  );
}

function openaiCreds(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function freeGoogleIds(): string[] {
  const extra = process.env.AGENT_FREE_MODEL?.trim();
  const ids = extra ? [extra, ...FREE_GOOGLE_MODELS] : [...FREE_GOOGLE_MODELS];
  return [...new Set(ids)];
}

/** Ordered candidates: primary first, then free alternates with separate quota buckets. */
export function getAgentModelCandidates(): AgentModelCandidate[] {
  const candidates: AgentModelCandidate[] = [resolveAgentModel()];
  const seen = new Set(candidates.map((c) => c.modelId));

  // Different provider first — Gemini free-tier models often share one daily bucket,
  // so hopping flash → flash-lite does not save a spent key. OpenAI can.
  if (openaiCreds() && !seen.has("gpt-4o-mini")) {
    seen.add("gpt-4o-mini");
    candidates.push({ model: openai("gpt-4o-mini"), provider: "openai", modelId: "gpt-4o-mini" });
  }

  if (googleCreds()) {
    for (const freeId of freeGoogleIds()) {
      if (!seen.has(freeId)) {
        seen.add(freeId);
        candidates.push({ model: google(freeId), provider: "google", modelId: freeId });
      }
    }
  }
  return candidates;
}

/** First candidate whose free quota isn't cooling down. */
export function resolveAgentModelFallback(): AgentModelCandidate {
  const candidates = getAgentModelCandidates();
  return candidates.find((c) => !isModelCooling(c.modelId)) ?? candidates[0]!;
}

function asV3(model: LanguageModel): LanguageModelV3 | null {
  if (typeof model === "string") return null;
  if (model && typeof model === "object" && "doGenerate" in model && "doStream" in model) {
    return model as LanguageModelV3;
  }
  return null;
}

function coolIfQuota(modelId: string, error: unknown): boolean {
  const until = failureCooldownFromRaw(rawErrorText(error));
  if (until === null) return false;
  markModelCooldown(modelId, until);
  return true;
}

/**
 * Primary model with an in-request hop to free models when credits/quota run out.
 * Avoids the SDK retrying the exhausted model (that wait is what makes chat drag).
 */
export function resolveAgentLanguageModel(): LanguageModel {
  const candidates = getAgentModelCandidates();
  const start = candidates.find((c) => !isModelCooling(c.modelId)) ?? candidates[0]!;
  const startV3 = asV3(start.model);
  const rest = candidates.filter((c) => c.modelId !== start.modelId);

  if (!startV3 || rest.length === 0) return start.model;

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3",
    wrapGenerate: async ({ doGenerate, params }) => {
      try {
        return await doGenerate();
      } catch (error) {
        if (!coolIfQuota(start.modelId, error)) throw error;
        console.warn(`[agent] ${start.modelId} out of credits — switching to a free model`);
        let last: unknown = error;
        for (const next of rest) {
          if (isModelCooling(next.modelId)) continue;
          const v3 = asV3(next.model);
          if (!v3) continue;
          try {
            console.info(`[agent] using free fallback ${next.modelId}`);
            return await v3.doGenerate(params);
          } catch (fallbackError) {
            last = fallbackError;
            if (!coolIfQuota(next.modelId, fallbackError)) throw fallbackError;
          }
        }
        throw last;
      }
    },
    wrapStream: async ({ doStream, params }) => {
      try {
        return await doStream();
      } catch (error) {
        if (!coolIfQuota(start.modelId, error)) throw error;
        console.warn(`[agent] ${start.modelId} out of credits — switching to a free model`);
        let last: unknown = error;
        for (const next of rest) {
          if (isModelCooling(next.modelId)) continue;
          const v3 = asV3(next.model);
          if (!v3) continue;
          try {
            console.info(`[agent] using free fallback ${next.modelId}`);
            return await v3.doStream(params);
          } catch (fallbackError) {
            last = fallbackError;
            if (!coolIfQuota(next.modelId, fallbackError)) throw fallbackError;
          }
        }
        throw last;
      }
    },
  };

  return wrapLanguageModel({ model: startV3, middleware });
}
