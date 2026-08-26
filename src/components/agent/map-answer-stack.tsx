"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { useMapSession } from "./map-session-provider";
import { MapJobResultsPanel } from "./map-job-results-panel";
import { MapGranularInsight } from "./map-granular-insight";
import { MapBizJournalPanel } from "./map-biz-journal-panel";
import { MapTransitPanel } from "./map-transit-panel";
import { MapInsightPanel } from "./map-insight-panel";
import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";
import { AnswerCard, LegendDot, MapLegendHint } from "./answer-panel-chrome";
import { useMapStore } from "@/lib/map-store";

/** Floating answer cards on the map margin.
 *  Mobile: a capped, collapsible top sheet so answers never bury the map;
 *  tapping a county hands the screen to the county sheet instead.
 *  Desktop: unchanged floating column with hover pass-through to the map. */
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
  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const [expanded, setExpanded] = useState(true);
  const stackRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef(question);

  // A new question always re-opens the summary and presents from the top —
  // the unemployment gauge / headline must never start scrolled out of view.
  useEffect(() => {
    if (question !== lastQuestionRef.current) {
      lastQuestionRef.current = question;
      setExpanded(true);
      if (stackRef.current) stackRef.current.scrollTo({ top: 0 });
    }
  }, [question]);

  const hasJobResults = Boolean(localMapAnswer?.jobs.length);
  const transitIntent = inferMapQueryIntent(question);
  const showTransitPanel = Boolean(
    transitIntent?.transitMetro ||
      transitIntent?.metric === "transit-coverage" ||
      (transitIntent?.searchJobs?.transitOnly && transitIntent.searchJobs)
  );

  return (
    <AnimatePresence>
      {showAnswerStack && (
        <motion.div
          ref={stackRef}
          key="answer-stack"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.99 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className={cn(
            "float-scroll pointer-events-none fixed z-30 flex flex-col gap-2 overflow-y-auto overscroll-contain",
            // Mobile: full-width sheet under the logo, capped so the map stays usable
            "inset-x-3 top-[4.25rem] max-h-[min(56dvh,calc(100dvh-13.5rem))]",
            // sm+: floating column on the right margin
            "sm:left-auto sm:right-4 sm:top-[4.5rem] sm:w-[min(380px,calc(100vw-2rem))] sm:max-h-[calc(100dvh-11rem)] lg:top-20",
            // County detail and answer stack take turns below lg — at 640–1023px
            // they can't fit side by side (340 + 380 + margins > viewport).
            selectedCounty && "max-lg:hidden"
          )}
        >
          <AnswerCard>
            {/* Collapse toggle — doubles as the section header */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse answer" : "Expand answer"}
              className="pointer-events-auto relative z-10 flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-left"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="accent-bar-glow h-4 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 to-[#1e6b9c]"
                  aria-hidden
                />
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">
                  Summary
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-white/50 transition-transform duration-200",
                  !expanded && "-rotate-90"
                )}
                aria-hidden
              />
            </button>

            {expanded ? (
              <div className="pointer-events-auto space-y-2.5 px-4 py-3.5 sm:pointer-events-none">
                {question && !localMapAnswer?.countyFocus && (
                  <p className="border-l-2 border-white/15 pl-3 text-[12px] leading-snug text-white/50">
                    {question}
                  </p>
                )}
                {isLoading && !displayAnswer ? (
                  <DataGatheringLoader
                    messages={gatheringMessages}
                    variant="dark"
                    subtitle="Pulling live Wisconsin data — usually a few seconds"
                  />
                ) : (
                  <>
                    <p className="font-display text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-white lg:text-[17px]">
                      {displayAnswer}
                      {isStreamingAssistant && (
                        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-cyan-400 align-middle" />
                      )}
                    </p>
                    {localMapAnswer?.subline && !localMapAnswer.countyFocus && (
                      <p className="text-[12px] leading-relaxed text-white/55">{localMapAnswer.subline}</p>
                    )}
                  </>
                )}
                <MapLegendHint>
                  {hasJobResults ? (
                    <>
                      <LegendDot color="#267a55" label="≤30 min" />
                      <LegendDot color="#1e6b9c" label="≤45 min" />
                      <span className="text-white/30">·</span>
                      <span>Tap pins for details</span>
                    </>
                  ) : localMapAnswer?.bizStories?.length ? (
                    <span>Business journal pins on map · tap for story</span>
                  ) : localMapAnswer?.countyFocus ? (
                    <span>Colored by {localMapAnswer.countyFocus.metric.replace("-", " ")} · tap counties</span>
                  ) : (
                    <span>Tap any county to explore</span>
                  )}
                </MapLegendHint>
              </div>
            ) : (
              displayAnswer && (
                <p className="line-clamp-2 px-4 py-2.5 text-[13px] font-medium leading-snug text-white/80">
                  {isStreamingAssistant && (
                    <span className="mr-1.5 inline-block h-3 w-0.5 animate-pulse bg-cyan-400 align-middle" />
                  )}
                  {displayAnswer}
                </p>
              )
            )}
          </AnswerCard>

          {expanded && localMapAnswer && localMapAnswer.jobs.length > 0 && (
            <MapJobResultsPanel result={localMapAnswer} />
          )}

          {expanded && localMapAnswer?.bizStories && localMapAnswer.bizStories.length > 0 && (
            <MapBizJournalPanel
              stories={localMapAnswer.bizStories}
              areaLabel={localMapAnswer.jobs.length ? "Moves & growth" : undefined}
            />
          )}

          {expanded && showTransitPanel && (
            <div className="pointer-events-auto">
              <MapTransitPanel metro={transitIntent?.transitMetro} />
            </div>
          )}

          {expanded && !hasJobResults && localMapAnswer?.countyFocus && (
            <MapGranularInsight focus={localMapAnswer.countyFocus} />
          )}

          {expanded && !hasJobResults && !localMapAnswer?.countyFocus && (
            <AnswerCard className="pointer-events-auto">
              <div className="px-4 py-3.5">
                <MapInsightPanel showLegend />
              </div>
            </AnswerCard>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
