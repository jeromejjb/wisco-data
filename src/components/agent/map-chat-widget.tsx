"use client";

import { useState, useRef, useEffect, FormEvent, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { overlaySpring } from "@/lib/motion";
import { DataGatheringLoader, GatheringPulse } from "@/components/ui/data-gathering-loader";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { formatAssistantChatText, getMessageText } from "@/lib/agent/chat-display";
import { useAgentShell } from "./agent-shell";
import { useMapSession } from "./map-session-provider";
import { LocalPromptBar } from "./local-prompt-bar";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import { applyQueryAreaSync } from "@/lib/query-area-sync";
import { usePromptHistory } from "@/hooks/use-prompt-history";
import { useMapStore } from "@/lib/map-store";

const HistoryLine = memo(function HistoryLine({ message }: { message: WorkwaysAgentMessage }) {
  const isUser = message.role === "user";
  const raw = getMessageText(message);
  const text = isUser ? raw : formatAssistantChatText(raw);
  if (!text.trim()) return null;
  return (
    <p className={cn("text-[12px] leading-relaxed", isUser ? "text-[#1e6b9c] dark:text-[#4da3d4]" : "text-[#3d4659] dark:text-[#c5cddb]")}>
      <span className="font-semibold">{isUser ? "You" : "AI"}:</span> {text}
    </p>
  );
});

/** Full-viewport map + unified bottom ask dock; answers float on map via MapAnswerStack. */
export function MapChatWidget() {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [focused, setFocused] = useState(false);
  const [errorDismissedKey, setErrorDismissedKey] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const { pendingPrompt, consumePendingPrompt } = useAgentShell();

  // Publish the dock's live total height (loader + banners + safe padding) as a
  // CSS var so bottom sheets (county panel) anchor to reality instead of a
  // static guess — static offsets let content slide under the translucent dock.
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty(
        "--dock-total",
        `${Math.ceil(el.getBoundingClientRect().height)}px`
      );
    };
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    window.addEventListener("orientationchange", setVar);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", setVar);
      document.documentElement.style.removeProperty("--dock-total");
    };
  }, []);

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

  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const reduceMotion = useReducedMotion();
  const showPrompts = !isLoading;
  const canSend = Boolean(input.trim()) && !isLoading;
  const errorKey = agentError?.message ?? "";
  const showError = Boolean(agentError) && errorDismissedKey !== errorKey;

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
      ref={shellRef}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={overlaySpring}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center p-3 pb-[var(--safe-pb)] sm:p-4 sm:pb-[var(--safe-pb)]"
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
          "map-ask-dock pointer-events-auto w-full max-w-[540px] overflow-hidden rounded-[26px] border bg-white/[0.96] backdrop-blur-xl transition-shadow duration-300 dark:bg-[#0f1524]/[0.94]",
          focused
            ? "is-focused border-[#1e6b9c]/25"
            : "border-white/70 dark:border-white/10"
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
          hideCarouselOnMobile={Boolean(selectedCounty || hasAnswer)}
        />

        {showHistory && messages.length > 0 && (
          <div className="max-h-[180px] space-y-2 overflow-y-auto border-t border-black/[0.05] px-4 py-3 dark:border-white/10">
            {messages.map((m) => (
              <HistoryLine key={m.id} message={m} />
            ))}
          </div>
        )}

        <AnimatePresence>
          {showError && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-amber-100/80 bg-amber-50/90 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-950/50 sm:px-4 sm:py-2.5"
              role="status"
              aria-live="assertive"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p id="map-ask-status" className="text-[12px] font-semibold text-amber-950 dark:text-amber-50">
                    {agentErrorInfo.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-amber-900/80 dark:text-amber-100/80 sm:line-clamp-none">
                    {agentErrorInfo.detail}
                  </p>
                  {localMapAnswer && (
                    <p className="mt-1 hidden text-[10px] text-amber-800/70 dark:text-amber-100/55 sm:block">
                      {agentErrorInfo.fallbackNote}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setErrorDismissedKey(errorKey)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-amber-900/70 hover:bg-amber-200/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-100 dark:hover:bg-white/10"
                  aria-label="Dismiss notice"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSubmit}
          aria-busy={isLoading}
          className="relative flex items-end border-t border-black/[0.05] px-3 py-2.5 dark:border-white/10"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="absolute bottom-2 left-2 flex h-11 w-11 items-center justify-center rounded-full text-[#6b7388] transition-colors hover:bg-[#f0f3f7] hover:text-[#3d4659] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-[#c5cddb] dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={showHistory ? "Hide chat history" : "Show chat history"}
              aria-pressed={showHistory}
            >
              {showHistory ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          )}
          <label htmlFor="map-ask" className="sr-only">
            Ask about Wisconsin jobs, wages, or a county
          </label>
          <textarea
            id="map-ask"
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
            aria-invalid={showError || undefined}
            aria-describedby={showError ? "map-ask-status" : undefined}
            className={cn(
              // text-base keeps iOS Safari from zooming the viewport on focus (<16px triggers auto-zoom)
              "map-ask-input max-h-[88px] min-h-[44px] w-full resize-none border-0 bg-transparent py-2.5 pr-14 text-base leading-snug text-[#0c1222] caret-[#1e6b9c] shadow-none outline-none ring-0 placeholder:text-[#6b7388] focus:outline-none focus:ring-0 read-only:cursor-default read-only:opacity-60 sm:text-[15px] dark:text-[#eef2f7] dark:caret-[#4da3d4] dark:placeholder:text-[#9aa3b5]",
              messages.length > 0 ? "pl-12" : "pl-0.5"
            )}
          />
          <motion.button
            type="submit"
            disabled={!canSend}
            whileHover={canSend && !reduceMotion ? { scale: 1.04 } : undefined}
            whileTap={canSend && !reduceMotion ? { scale: 0.96 } : undefined}
            className={cn(
              "absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              canSend
                ? "bg-[#1e6b9c] text-white shadow-[0_4px_14px_rgba(30,107,156,0.35)]"
                : "bg-[#eceef2] text-[#b0b8c8] dark:bg-white/15 dark:text-[#8b95a8]"
            )}
            aria-label="Send question"
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
