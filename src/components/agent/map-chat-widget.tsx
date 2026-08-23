"use client";

import { useState, useRef, useEffect, FormEvent, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataGatheringLoader, GatheringPulse } from "@/components/ui/data-gathering-loader";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { formatAssistantChatText, getMessageText } from "@/lib/agent/chat-display";
import { useAgentShell } from "./agent-shell";
import { useMapSession } from "./map-session-provider";
import { LocalPromptBar } from "./local-prompt-bar";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import { applyQueryAreaSync } from "@/lib/query-area-sync";
import { usePromptHistory } from "@/hooks/use-prompt-history";

const HistoryLine = memo(function HistoryLine({ message }: { message: WorkwaysAgentMessage }) {
  const isUser = message.role === "user";
  const raw = getMessageText(message);
  const text = isUser ? raw : formatAssistantChatText(raw);
  if (!text.trim()) return null;
  return (
    <p className={cn("text-[12px] leading-relaxed", isUser ? "text-[#1e6b9c]" : "text-[#3d4659]")}>
      <span className="font-semibold">{isUser ? "You" : "AI"}:</span> {text}
    </p>
  );
});

/** Full-viewport map + unified bottom ask dock; answers float on map via MapAnswerStack. */
export function MapChatWidget() {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pendingPrompt, consumePendingPrompt } = useAgentShell();

  const {
    messages,
    sendMessage,
    isLoading,
    starters,
    area,
    meta,
    areaLoading,
    newsLoading,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
    hasAnswer,
    gatheringMessages,
    agentError,
    agentErrorInfo,
    localMapAnswer,
  } = useMapSession();

  const { onInputChange, handleHistoryKeyDown, resetHistory, recordPrompt } = usePromptHistory(
    messages,
    setInput
  );

  const showPrompts = !hasAnswer || !isLoading;
  const canSend = Boolean(input.trim()) && !isLoading;

  useEffect(() => {
    const prompt = consumePendingPrompt();
    if (!prompt) return;
    recordPrompt(prompt);
    sendMessage({ text: prompt });
  }, [pendingPrompt, consumePendingPrompt, sendMessage, recordPrompt]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, [input]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    applyQueryAreaSync(text);
    recordPrompt(text);
    sendMessage({ text });
    setInput("");
    resetHistory();
    setShowHistory(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (handleHistoryKeyDown(e)) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function pickStarter(starter: ChatStarter) {
    if (isLoading) return;
    trackStarterClick(starter);
    applyQueryAreaSync(starter.text);
    recordPrompt(starter.text);
    sendMessage({ text: starter.text });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34, delay: 0.15 }}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center p-4 pb-[var(--safe-pb)]"
    >
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto mb-2 w-full max-w-[540px]"
        >
          <DataGatheringLoader
            messages={gatheringMessages}
            variant="inline"
            subtitle="Gathering live Wisconsin data"
            className="w-full"
          />
        </motion.div>
      )}

      <motion.div
        layout
        className={cn(
          "map-ask-dock pointer-events-auto w-full max-w-[540px] overflow-hidden rounded-[26px] border bg-white/90 shadow-[var(--shadow-dock)] backdrop-blur-2xl transition-shadow duration-300",
          focused
            ? "border-[#1e6b9c]/25 shadow-[var(--shadow-dock-focus)]"
            : "border-white/70"
        )}
      >
        <LocalPromptBar
          variant="embedded"
          starters={starters}
          area={area}
          meta={meta}
          areaLoading={areaLoading}
          newsLoading={newsLoading}
          newsPromptsEnabled={newsPromptsEnabled}
          onPick={pickStarter}
          disabled={isLoading}
          showCarousel={showPrompts}
        />

        {showHistory && messages.length > 0 && (
          <div className="max-h-[180px] space-y-2 overflow-y-auto border-t border-black/[0.05] px-4 py-3">
            {messages.map((m) => (
              <HistoryLine key={m.id} message={m} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {agentError && !localMapAnswer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-amber-100/80 bg-amber-50/90 px-4 py-2.5"
            >
              <p className="text-[12px] font-semibold text-amber-950">{agentErrorInfo.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-amber-900/75">
                {agentErrorInfo.detail}
              </p>
              {agentErrorInfo.isRateLimited && agentErrorInfo.retryAfterMinutes && (
                <p className="mt-1 text-[10px] text-amber-800/60">
                  Usually resolves within {agentErrorInfo.retryAfterMinutes} min — no action needed.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {agentError && localMapAnswer && (
          <div className="border-t border-black/[0.05] bg-[#f8f9fb] px-4 py-2">
            <p className="text-[11px] text-[#5a6278]">
              <span className="font-semibold text-[#3d4659]">{agentErrorInfo.title}.</span>{" "}
              {agentErrorInfo.fallbackNote}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="relative flex items-end border-t border-black/[0.05] px-3 py-2.5"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="absolute bottom-2.5 left-3 flex h-7 w-7 items-center justify-center rounded-full text-[#8b95a8] transition-colors hover:bg-[#f0f3f7] hover:text-[#3d4659]"
              aria-label="Toggle history"
            >
              {showHistory ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              area.source !== "default"
                ? `Ask about ${area.displayName}, jobs, wages…`
                : "Ask about jobs, wages, or any county…"
            }
            readOnly={isLoading}
            rows={1}
            className={cn(
              "map-ask-input max-h-[88px] min-h-[24px] w-full resize-none border-0 bg-transparent py-1 pr-11 text-[15px] leading-snug text-[#0c1222] shadow-none outline-none ring-0 placeholder:text-[#9aa3b5] focus:outline-none focus:ring-0 read-only:cursor-default read-only:opacity-60",
              messages.length > 0 ? "pl-9" : "pl-0.5"
            )}
          />
          <motion.button
            type="submit"
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.06 } : undefined}
            whileTap={canSend ? { scale: 0.94 } : undefined}
            className={cn(
              "absolute bottom-2.5 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200",
              canSend
                ? "bg-[#1e6b9c] text-white shadow-[0_4px_14px_rgba(30,107,156,0.35)]"
                : "bg-[#eceef2] text-[#b0b8c8]"
            )}
            aria-label="Send"
          >
            {isLoading ? (
              <GatheringPulse tone="lake" className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
