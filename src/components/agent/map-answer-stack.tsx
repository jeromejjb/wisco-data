"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { overlaySpring } from "@/lib/motion";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { useMapSession } from "./map-session-provider";
import { CompactJobList, JobSheetSummary } from "./map-job-results-panel";
import { MapGranularInsight } from "./map-granular-insight";
import { MapBizJournalPanel } from "./map-biz-journal-panel";
import { MapTransitPanel } from "./map-transit-panel";
import { MapInsightPanel } from "./map-insight-panel";
import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";
import { AnswerCard, MapLegendHint } from "./answer-panel-chrome";
import { useMapStore } from "@/lib/map-store";
import type { MapJobHit } from "@/lib/agent/local-map-answer";

/** One HUD surface on the map — a pill when collapsed, a sheet when jobs exist.
 *  Job results sit above the ask dock on phones (Maps-style) so all roles can scroll. */
export function MapAnswerStack() {
  const {
    showAnswerStack,
    displayAnswer,
    answer,
    question,
    isLoading,
    isStreamingAssistant,
    gatheringMessages,
    localMapAnswer,
  } = useMapSession();
  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const markers = useMapStore((s) => s.markers);
  const focusMarker = useMapStore((s) => s.focusMarker);
  const sheetDraggedRef = useRef(false);
  const [expanded, setExpanded] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const lastQuestionRef = useRef(question);

  const jobs = localMapAnswer?.jobs ?? [];
  const hasJobResults = jobs.length > 0;

  useEffect(() => {
    if (question !== lastQuestionRef.current) {
      lastQuestionRef.current = question;
      const narrow = window.matchMedia("(max-width: 1023px)").matches;
      const intent = inferMapQueryIntent(question);
      const likelyStructured = Boolean(
        intent?.metric ||
          intent?.searchJobs ||
          intent?.bizJournalNews ||
          intent?.localNews
      );
      setExpanded(!narrow || likelyStructured);
      setSelectedJobId(null);
      if (stackRef.current) stackRef.current.scrollTo({ top: 0 });
    }
  }, [question]);

  useEffect(() => {
    if (
      localMapAnswer?.countyFocus ||
      localMapAnswer?.bizStories?.length ||
      localMapAnswer?.subline
    ) {
      setExpanded(true);
    }
  }, [localMapAnswer]);

  useEffect(() => {
    if (!selectedCounty || hasJobResults) return;
    if (localMapAnswer?.countyFocus || localMapAnswer?.bizStories?.length) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setExpanded(false);
    }
  }, [selectedCounty, selectedCounty?.fips, hasJobResults, localMapAnswer]);
  const transitIntent = inferMapQueryIntent(question);
  const showTransitPanel = Boolean(
    transitIntent?.transitMetro ||
      transitIntent?.metric === "transit-coverage" ||
      (transitIntent?.searchJobs?.transitOnly && transitIntent.searchJobs)
  );

  const sheet = hasJobResults || expanded;

  function focusJob(job: MapJobHit) {
    setSelectedJobId(job.id);
    const coords =
      job.coordinates ?? markers.find((m) => m.id === job.id)?.coordinates;
    focusMarker(job.id, coords);
  }

  function toggleExpanded() {
    setExpanded((v) => !v);
  }

  return (
    <AnimatePresence>
      {showAnswerStack && (
        <motion.div
          ref={stackRef}
          key="answer-stack"
          initial={{ opacity: 0, y: hasJobResults ? 8 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={overlaySpring}
          role="region"
          aria-label={hasJobResults ? "Job roles near you" : "Prompt answer"}
          className={cn(
            "pointer-events-none fixed z-30 flex flex-col",
            hasJobResults
              ? cn(
                  "inset-x-3 bottom-[calc(var(--dock-total,10rem)+0.5rem)] motion-safe:transition-[height] motion-safe:duration-150 motion-safe:ease-out",
                  expanded
                    ? "h-[min(64dvh,calc(100dvh-var(--dock-total,10rem)-1.25rem))]"
                    : "h-[min(42dvh,380px)]",
                  "lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-[5.5rem] lg:w-[min(380px,calc(100vw-2rem))]",
                  expanded
                    ? "lg:h-[min(70dvh,calc(100dvh-10rem))]"
                    : "lg:h-[min(48dvh,440px)]"
                )
              : cn(
                  "float-scroll overflow-y-auto overscroll-contain",
                  "inset-x-3 top-[5.75rem]",
                  selectedCounty
                    ? "max-h-[min(28dvh,calc(100dvh-var(--dock-total,10rem)-12rem))]"
                    : "max-h-[min(52dvh,calc(100dvh-12rem))]",
                  "lg:inset-x-auto lg:left-auto lg:right-4 lg:top-[5.5rem] lg:w-[min(360px,calc(100vw-2rem))] lg:max-h-[calc(100dvh-10rem)]"
                )
          )}
        >
          <div
            className={cn(
              "pointer-events-auto flex min-h-0 flex-col overflow-hidden bg-[#0c1222]/95 shadow-[0_12px_40px_rgba(4,8,18,0.35)]",
              hasJobResults && "h-full",
              sheet ? "rounded-[22px]" : "rounded-full"
            )}
          >
            {hasJobResults && (
              <motion.button
                type="button"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.18}
                onDragStart={() => {
                  sheetDraggedRef.current = true;
                }}
                onDragEnd={(_e, info: PanInfo) => {
                  if (info.offset.y < -28 || info.velocity.y < -350) {
                    setExpanded(true);
                  } else if (info.offset.y > 28 || info.velocity.y > 350) {
                    setExpanded(false);
                  }
                  window.setTimeout(() => {
                    sheetDraggedRef.current = false;
                  }, 0);
                }}
                onClick={() => {
                  if (sheetDraggedRef.current) return;
                  toggleExpanded();
                }}
                tabIndex={-1}
                aria-hidden
                className="flex min-h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center pt-1 active:cursor-grabbing lg:hidden"
              >
                <span className="h-1.5 w-11 rounded-full bg-white/40" />
              </motion.button>
            )}

            <button
              type="button"
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse answer" : "Expand answer"}
              className={cn(
                "flex w-full shrink-0 items-center justify-between gap-3 text-left",
                sheet ? "px-4 py-3" : "px-4 py-2.5"
              )}
            >
              <span className="min-w-0 truncate font-display text-[13px] font-semibold leading-snug text-white sm:text-[14px]">
                {displayAnswer || "Live Wisconsin data"}
                {isStreamingAssistant && (
                  <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-cyan-400 align-middle" />
                )}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-white/70 transition-transform duration-150",
                  !expanded && "rotate-180"
                )}
                aria-hidden
              />
            </button>

            {hasJobResults && (
              <div className="flex min-h-0 flex-1 flex-col border-t border-white/8">
                {localMapAnswer ? <JobSheetSummary result={localMapAnswer} /> : null}
                <CompactJobList
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onFocusJob={focusJob}
                />
              </div>
            )}

            {expanded && !hasJobResults && (
              <div className="space-y-2.5 border-t border-white/8 px-4 py-3">
                {isLoading && !displayAnswer ? (
                  <DataGatheringLoader
                    messages={gatheringMessages}
                    variant="dark"
                    subtitle="Pulling live Wisconsin data — usually a few seconds"
                  />
                ) : (
                  <>
                    {question ? (
                      <p className="text-[12px] leading-snug text-white/45">{question}</p>
                    ) : null}
                    {localMapAnswer?.subline ? (
                      <p className="text-[12px] leading-relaxed text-white/60">
                        {localMapAnswer.subline}
                      </p>
                    ) : null}
                    {answer &&
                    answer !== displayAnswer &&
                    answer !== localMapAnswer?.headline ? (
                      <p className="text-[13px] leading-relaxed text-white/75">{answer}</p>
                    ) : null}
                    <MapLegendHint>
                      {localMapAnswer?.bizStories?.length ? (
                        <span>Journal pins on the map · tap for a story</span>
                      ) : localMapAnswer?.countyFocus ? (
                        <span>
                          Colored by {localMapAnswer.countyFocus.metric.replace("-", " ")} · tap
                          counties
                        </span>
                      ) : (
                        <span>Tap a county for labor-market detail</span>
                      )}
                    </MapLegendHint>
                  </>
                )}
              </div>
            )}
          </div>

          {expanded && !hasJobResults && localMapAnswer?.bizStories && localMapAnswer.bizStories.length > 0 && (
            <div className={cn("mt-2", selectedCounty && "max-lg:hidden")}>
              <MapBizJournalPanel
                stories={localMapAnswer.bizStories}
                heading={
                  localMapAnswer.bizStories.some((story) => story.source !== "biz-journal")
                    ? "Local news"
                    : "Business journals"
                }
                areaLabel={localMapAnswer.jobs.length ? "Moves & growth" : undefined}
              />
            </div>
          )}

          {expanded && !hasJobResults && showTransitPanel && (
            <div className={cn("pointer-events-auto mt-2", selectedCounty && "max-lg:hidden")}>
              <MapTransitPanel metro={transitIntent?.transitMetro} />
            </div>
          )}

          {expanded && !hasJobResults && localMapAnswer?.countyFocus && (
            <div className={cn("mt-2", selectedCounty && "max-lg:hidden")}>
              <MapGranularInsight focus={localMapAnswer.countyFocus} />
            </div>
          )}

          {expanded && !hasJobResults && !localMapAnswer?.countyFocus && transitIntent?.metric && (
            <AnswerCard className={cn("pointer-events-auto mt-2", selectedCounty && "max-lg:hidden")}>
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
