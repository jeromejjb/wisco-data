"use client";

import { useEffect, useRef } from "react";
import { useMapStore } from "@/lib/map-store";
import { extractMapActionsFromOutput } from "@/lib/agent/map-actions";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";

type AgentMapBridgeProps = {
  messages: WorkwaysAgentMessage[];
  /** Called when the agent applies one or more map actions (auto-switch to map view). */
  onMapActionsApplied?: () => void;
};

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
  toolCallId?: string;
  preliminary?: boolean;
};

function toolPartKey(part: ToolPart): string | null {
  if (part.toolCallId) return part.toolCallId;
  if (part.state !== "output-available" || !part.output) return null;
  try {
    return `${part.type}:${JSON.stringify(part.output).slice(0, 120)}`;
  } catch {
    return part.type;
  }
}

export function AgentMapBridge({ messages, onMapActionsApplied }: AgentMapBridgeProps) {
  const applyActions = useMapStore((s) => s.applyActions);
  const processedRef = useRef<Set<string>>(new Set());
  const onMapActionsAppliedRef = useRef(onMapActionsApplied);

  useEffect(() => {
    onMapActionsAppliedRef.current = onMapActionsApplied;
  }, [onMapActionsApplied]);

  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        const toolPart = part as ToolPart;
        if (!toolPart.type.startsWith("tool-")) continue;
        if (toolPart.state !== "output-available") continue;
        if (toolPart.preliminary) continue;

        const key = toolPartKey(toolPart);
        if (!key || processedRef.current.has(key)) continue;

        const actions = extractMapActionsFromOutput(toolPart.output);
        if (actions.length > 0) {
          processedRef.current.add(key);
          applyActions(actions);
          onMapActionsAppliedRef.current?.();
        }
      }
    }
  }, [messages, applyActions]);

  return null;
}
