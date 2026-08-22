import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type AgentProvider = "google" | "openai" | "gateway";

export function resolveAgentModel(): { model: LanguageModel; provider: AgentProvider; modelId: string } {
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
