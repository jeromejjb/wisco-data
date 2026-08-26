"use client";

import { useEffect, useRef } from "react";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { extractMapActionsFromOutput } from "@/lib/agent/map-actions";
import { getMessageText } from "@/lib/agent/chat-display";
import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";
import { buildLocalMapAnswer } from "@/lib/agent/local-map-answer";
import { applyQueryAreaSync } from "@/lib/query-area-sync";
import { useMapStore } from "@/lib/map-store";

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
  preliminary?: boolean;
};

function assistantUsedMapTools(messages: WorkwaysAgentMessage[]): boolean {
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      const tool = part as ToolPart;
      if (!tool.type.startsWith("tool-")) continue;
      if (tool.state !== "output-available" || tool.preliminary) continue;
      if (extractMapActionsFromOutput(tool.output).length > 0) return true;
    }
  }
  return false;
}

function assistantHasText(messages: WorkwaysAgentMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    return Boolean(getMessageText(messages[i]).trim());
  }
  return false;
}

/**
 * Live data fallback: runs when the agent errors, stays silent, or skips map tools.
 */
export function useLocalMapAnswer(
  messages: WorkwaysAgentMessage[],
  status: string,
  error: Error | undefined,
  onApplied?: () => void,
  area?: { displayName: string; countyId: string }
) {
  const applyActions = useMapStore((s) => s.applyActions);
  const setLocalMapAnswer = useMapStore((s) => s.setLocalMapAnswer);
  const processedTurnRef = useRef<string>("");
  const onAppliedRef = useRef(onApplied);

  useEffect(() => {
    onAppliedRef.current = onApplied;
  }, [onApplied]);

  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      if (status === "submitted") setLocalMapAnswer(null);
      return;
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const turnKey = `${lastUser.id}:${messages.length}:${error?.message ?? "ok"}`;
    if (processedTurnRef.current === turnKey) return;

    const intent = inferMapQueryIntent(getMessageText(lastUser));
    if (!intent) return;

    applyQueryAreaSync(getMessageText(lastUser));

    const usedTools = assistantUsedMapTools(messages);
    const hasText = assistantHasText(messages);
    const shouldRun =
      Boolean(error) ||
      !hasText ||
      !usedTools ||
      Boolean(intent.searchJobs) ||
      Boolean(intent.bizJournalNews) ||
      Boolean(intent.flyToCountyId) ||
      Boolean(intent.metric);
    if (!shouldRun) return;

    processedTurnRef.current = turnKey;

    void buildLocalMapAnswer(intent, { area }).then((answer) => {
      if (!answer) return;
      setLocalMapAnswer(answer);
      if (answer.mapActions.length) {
        applyActions(answer.mapActions);
      }
      if (answer.bizMapPins?.length) {
        useMapStore.getState().setLocalNewsLayer(answer.bizMapPins, null);
      }
      onAppliedRef.current?.();
    });
  }, [messages, status, error, applyActions, setLocalMapAnswer, area]);
}

/** @deprecated use useLocalMapAnswer */
export function useMapQueryFallback(
  messages: WorkwaysAgentMessage[],
  status: string,
  onApplied?: () => void
) {
  useLocalMapAnswer(messages, status, undefined, onApplied);
}
