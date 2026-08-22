"use client";

import { useRef, useCallback, useEffect } from "react";
import { getMessageText } from "@/lib/agent/chat-display";

type MessageLike = { role: string; parts?: unknown[] };

export function usePromptHistory(
  messages: MessageLike[],
  setInput: (v: string) => void
) {
  const promptsRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const draftRef = useRef("");
  const navigatingRef = useRef(false);
  const syncedMessagesRef = useRef(0);

  const resetHistory = useCallback(() => {
    historyIndexRef.current = -1;
    draftRef.current = "";
  }, []);

  const recordPrompt = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const list = promptsRef.current;
    if (list[list.length - 1] !== trimmed) list.push(trimmed);
  }, []);

  // Hydrate from chat once (e.g. starter chips sent before recordPrompt existed).
  useEffect(() => {
    if (messages.length <= syncedMessagesRef.current) return;
    syncedMessagesRef.current = messages.length;
    for (const m of messages) {
      if (m.role !== "user") continue;
      try {
        recordPrompt(getMessageText(m as Parameters<typeof getMessageText>[0]));
      } catch {
        /* ignore malformed messages */
      }
    }
  }, [messages, recordPrompt]);

  const onInputChange = useCallback(
    (value: string) => {
      if (!navigatingRef.current) resetHistory();
      setInput(value);
    },
    [resetHistory, setInput]
  );

  const applyHistoryIndex = useCallback(
    (index: number, el: HTMLTextAreaElement) => {
      navigatingRef.current = true;
      const text = promptsRef.current[index] ?? "";
      setInput(text);
      navigatingRef.current = false;
      requestAnimationFrame(() => {
        const len = text.length;
        el.selectionStart = len;
        el.selectionEnd = len;
      });
    },
    [setInput]
  );

  const handleHistoryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      const prompts = promptsRef.current;
      if (prompts.length === 0) return false;

      const el = e.currentTarget;
      const value = el.value;
      const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
      const atEnd =
        el.selectionStart === value.length && el.selectionEnd === value.length;
      const inHistory = historyIndexRef.current !== -1;
      const empty = value.length === 0;

      if (e.key === "ArrowUp") {
        if (!empty && !atStart && !inHistory) return false;
        e.preventDefault();
        e.stopPropagation();
        if (!inHistory) {
          draftRef.current = value;
          historyIndexRef.current = prompts.length - 1;
        } else if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
        }
        applyHistoryIndex(historyIndexRef.current, el);
        return true;
      }

      if (e.key === "ArrowDown" && inHistory) {
        if (!empty && !atEnd) return false;
        e.preventDefault();
        e.stopPropagation();
        if (historyIndexRef.current < prompts.length - 1) {
          historyIndexRef.current += 1;
          applyHistoryIndex(historyIndexRef.current, el);
        } else {
          historyIndexRef.current = -1;
          navigatingRef.current = true;
          setInput(draftRef.current);
          navigatingRef.current = false;
          requestAnimationFrame(() => {
            const len = draftRef.current.length;
            el.selectionStart = len;
            el.selectionEnd = len;
          });
        }
        return true;
      }

      return false;
    },
    [applyHistoryIndex, setInput]
  );

  return { onInputChange, handleHistoryKeyDown, resetHistory, recordPrompt };
}
