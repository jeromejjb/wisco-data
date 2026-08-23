"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { useMapSession } from "./map-session-provider";
import { MapJobResultsPanel } from "./map-job-results-panel";
import { MapGranularInsight } from "./map-granular-insight";
import { MapBizJournalPanel } from "./map-biz-journal-panel";
import { MapTransitPanel } from "./map-transit-panel";
import { MapInsightPanel } from "./map-insight-panel";
import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";
import { AnswerCard, AnswerSectionHeader, LegendDot, MapLegendHint } from "./answer-panel-chrome";
import { useMapStore } from "@/lib/map-store";

/** Floating answer cards on the map margin. */
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
          key="answer-stack"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="pointer-events-none fixed right-4 top-[4.5rem] z-30 flex max-h-[calc(100dvh-11rem)] w-[min(380px,calc(100vw-2rem))] flex-col gap-2.5 overflow-y-auto pb-2 lg:top-20"
        >
          <AnswerCard>
            <AnswerSectionHeader label="Summary" />
            <div className="space-y-2.5 px-4 py-3.5">
              {question && !localMapAnswer?.countyFocus && (
                <p className="border-l-2 border-white/15 pl-3 text-[12px] leading-snug text-white/50">
                  {question.length > 100 ? `${question.slice(0, 97)}…` : question}
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
                  <span>Colored by {localMapAnswer.countyFocus.metric.replace("-", " ")} · click counties</span>
                ) : (
                  <span>{choroplethMetric ? "Click any county to explore · hover for preview" : "Click any county to explore"}</span>
                )}
              </MapLegendHint>
            </div>
          </AnswerCard>

          {localMapAnswer && localMapAnswer.jobs.length > 0 && (
            <MapJobResultsPanel result={localMapAnswer} />
          )}

          {localMapAnswer?.bizStories && localMapAnswer.bizStories.length > 0 && (
            <MapBizJournalPanel
              stories={localMapAnswer.bizStories}
              areaLabel={localMapAnswer.jobs.length ? "Moves & growth" : undefined}
            />
          )}

          {showTransitPanel && (
            <div className="pointer-events-auto">
              <MapTransitPanel metro={transitIntent?.transitMetro} />
            </div>
          )}

          {!hasJobResults && localMapAnswer?.countyFocus && (
            <MapGranularInsight focus={localMapAnswer.countyFocus} />
          )}

          {!hasJobResults && !localMapAnswer?.countyFocus && (
            <div className="pointer-events-auto">
              <MapInsightPanel showLegend />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
