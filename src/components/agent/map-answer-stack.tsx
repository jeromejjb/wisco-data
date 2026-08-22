"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, Bus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { useMapSession } from "./map-session-provider";
import { MapJobResultsPanel } from "./map-job-results-panel";
import { MapGranularInsight } from "./map-granular-insight";
import { MapInsightPanel } from "./map-insight-panel";
import { useMapStore } from "@/lib/map-store";

/** Floating answer cards on the map margin (Option B). */
export function MapAnswerStack() {
  const {
    showAnswerStack,
    displayAnswer,
    question,
    isLoading,
    isStreamingAssistant,
    gatheringMessages,
    localMapAnswer,
  } = useMapSession();
  const choroplethMetric = useMapStore((s) => s.choroplethMetric);
  const hasJobResults = Boolean(localMapAnswer?.jobs.length);

  return (
    <AnimatePresence>
      {showAnswerStack && (
        <motion.div
          key="answer-stack"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="pointer-events-none fixed right-4 top-[4.5rem] z-30 flex max-h-[calc(100dvh-11rem)] w-[min(360px,calc(100vw-2rem))] flex-col gap-2 overflow-y-auto pb-2 lg:top-20"
        >
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/20 bg-[#0c1222]/88 shadow-[0_12px_48px_rgba(12,18,34,0.35)] backdrop-blur-xl">
            <div className="border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                <Sparkles className="h-3.5 w-3.5" />
                Answer
              </div>
            </div>
            <div className="space-y-3 px-4 py-3.5">
              {question && (
                <p className="text-[11px] leading-snug text-white/45">
                  &ldquo;{question.length > 80 ? `${question.slice(0, 77)}…` : question}&rdquo;
                </p>
              )}
              {isLoading && !displayAnswer ? (
                <DataGatheringLoader
                  messages={gatheringMessages}
                  variant="dark"
                  subtitle="We're pulling live Wisconsin data — this usually takes a few seconds"
                />
              ) : (
                <p
                  className={cn(
                    "font-display text-[17px] font-semibold leading-snug text-white lg:text-[18px]"
                  )}
                >
                  {displayAnswer}
                  {isStreamingAssistant && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-400 align-middle" />
                  )}
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-white/40">
                {hasJobResults ? (
                  <>
                    <Bus className="h-3 w-3" />
                    Blue pins = bus-friendly · tap for details
                  </>
                ) : localMapAnswer?.countyFocus ? (
                  <>
                    <MapPin className="h-3 w-3" />
                    County highlighted · compare bars below
                  </>
                ) : (
                  <>
                    <MapPin className="h-3 w-3" />
                    {choroplethMetric ? "Colored counties on the map" : "Results on the map"}
                  </>
                )}
              </p>
            </div>
          </div>

          {localMapAnswer && localMapAnswer.jobs.length > 0 && (
            <MapJobResultsPanel result={localMapAnswer} />
          )}

          {!hasJobResults && localMapAnswer?.countyFocus && (
            <MapGranularInsight focus={localMapAnswer.countyFocus} />
          )}

          {!hasJobResults && !localMapAnswer?.countyFocus && (
            <div className="pointer-events-auto">
              <MapInsightPanel
                showLegend
                className="[&>div:first-child]:border-white/15 [&>div:first-child]:bg-[#0c1222]/85 [&_p]:text-white [&_span]:text-white/80"
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
