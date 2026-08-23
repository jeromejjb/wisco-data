import { createAgentUIStreamResponse, safeValidateUIMessages } from "ai";
import { createWorkwaysAgent } from "@/lib/agent/workways-agent";
import { hasAgentCredentials, resolveAgentModel } from "@/lib/agent/model";
import { encodeAgentFailure } from "@/lib/rate-limit-messages";
import { refreshStaleSources } from "@/services/live/refresh";
import type { UserArea } from "@/lib/user-area";
import type { AreaNewsItem } from "@/lib/agent/chat-starters";

export const maxDuration = 60;

/** Warm stale feeds before agent sessions */
export async function GET() {
  const { provider, modelId } = resolveAgentModel();
  return Response.json({
    ok: hasAgentCredentials(),
    agent: { provider, modelId },
    hint: hasAgentCredentials()
      ? undefined
      : "Add GOOGLE_GENERATIVE_AI_API_KEY (free) or OPENAI_API_KEY to .env",
  });
}

export async function POST(req: Request) {
  if (!hasAgentCredentials()) {
    return new Response(
      JSON.stringify({
        error:
          "Add GOOGLE_GENERATIVE_AI_API_KEY from https://aistudio.google.com/apikey (free) or OPENAI_API_KEY to .env",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Background refresh of stale sources when agent is invoked
  refreshStaleSources().catch((e) => console.warn("Agent pre-refresh:", e));

  const body = await req.json();
  const { messages, userArea, localNews, areaSentiment } = body as {
    messages: unknown;
    userArea?: UserArea;
    localNews?: AreaNewsItem[];
    areaSentiment?: import("@/lib/news-types").AreaSentimentSnapshot | null;
  };

  const contextLines: string[] = [];
  if (userArea?.displayName) {
    contextLines.push(
      `## User location context`,
      `The user is near **${userArea.displayName}**, Wisconsin (detected via ${userArea.source}).`,
      `When they ask broad questions, anchor examples to ${userArea.countyName} and fly the map there when relevant.`
    );
  }
  if (localNews?.length) {
    contextLines.push(
      `## Recent local headlines (optional context — paint answers on the map, do not dump lists)`,
      ...localNews.slice(0, 3).map((n) => `- ${n.title}${n.summary ? `: ${n.summary.slice(0, 120)}` : ""}`)
    );
  }
  if (areaSentiment) {
    contextLines.push(
      `## Area news sentiment (${areaSentiment.areaName})`,
      `Vibe: ${areaSentiment.vibe} (${areaSentiment.tone}, score ${areaSentiment.score.toFixed(2)}). ${areaSentiment.oneLiner}`
    );
  }

  const agent = createWorkwaysAgent(
    contextLines.length ? contextLines.join("\n") : undefined
  );

  const validated = await safeValidateUIMessages({ messages });
  if (!validated.success) {
    return Response.json({ error: validated.error.message }, { status: 400 });
  }

  return createAgentUIStreamResponse({
    agent,
    uiMessages: validated.data,
    onError: (error) => {
      const raw = error instanceof Error ? error.message : String(error);
      console.error("Agent stream failed:", raw);
      return encodeAgentFailure(raw);
    },
  });
}
