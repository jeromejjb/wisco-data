"use client";

import { useEffect, useRef } from "react";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { getMessageText } from "@/lib/agent/chat-display";
import { applyQueryAreaSync } from "@/lib/query-area-sync";

/**
 * When the user searches another Wisconsin city/county, sync area picker + map focus.
 */
export function useSyncQueryArea(messages: WorkwaysAgentMessage[]) {
  const processedRef = useRef<string>("");

  useEffect(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    const text = getMessageText(lastUser).trim();
    const key = `${lastUser.id}:${text}`;
    if (!text || processedRef.current === key) return;
    processedRef.current = key;

    applyQueryAreaSync(text);
  }, [messages]);
}
