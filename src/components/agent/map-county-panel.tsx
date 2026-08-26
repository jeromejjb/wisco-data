"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  TrendingDown,
  Wallet,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/lib/map-store";
import {
  buildCountyExplorerSnapshot,
  metricLabelForExplorer,
} from "@/lib/county-explorer";
import { formatPopulation, formatIncome } from "@/lib/format-population";
import { WI_COUNTIES } from "@/lib/wi-counties";
import type { CountyEconomy } from "@/lib/types";
import { AnswerCard } from "./answer-panel-chrome";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

function unemploymentRank(fips: string, byFips: Record<string, number>) {
  const sorted = Object.entries(byFips).sort((a, b) => a[1] - b[1]);
  const idx = sorted.findIndex(([f]) => f === fips);
  if (idx < 0) return null;
  return { rank: idx + 1, total: sorted.length, rate: sorted[idx]![1] };
}

/** County explorer — labor market & demographics for the selected county. */
export function MapCountyPanel({ className }: { className?: string }) {
  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const clearSelectedCounty = useMapStore((s) => s.clearSelectedCounty);
  const mapDemographics = useMapStore((s) => s.mapDemographics);
  const choroplethMetric = useMapStore((s) => s.choroplethMetric);
  const choroplethValues = useMapStore((s) => s.choroplethValues);

  const isFeatured = selectedCounty
    ? WI_COUNTIES.some((c) => c.id === selectedCounty.countyId)
    : false;

  const { data: economyPayload } = useSWR<{ data: CountyEconomy }>(
    selectedCounty && isFeatured
      ? `/api/economy?county=${encodeURIComponent(selectedCounty.countyId)}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120_000 }
  );

  const snapshot = useMemo(() => {
    if (!selectedCounty) return null;
    return buildCountyExplorerSnapshot({
      fips: selectedCounty.fips,
      countyId: selectedCounty.countyId,
      name: selectedCounty.name,
      populationByFips: mapDemographics.populationByFips,
      populationEstimateByFips: mapDemographics.populationEstimateByFips,
      laborForceByFips: mapDemographics.laborForceByFips,
      medianIncomeByFips: mapDemographics.medianIncomeByFips,
      unemploymentByFips: mapDemographics.unemploymentByFips,
      choroplethMetric,
      choroplethValues,
      featuredEconomy: economyPayload?.data ?? null,
    });
  }, [
    selectedCounty,
    mapDemographics,
    choroplethMetric,
    choroplethValues,
    economyPayload,
  ]);

  const uRank = useMemo(() => {
    if (!selectedCounty || !mapDemographics.unemploymentByFips) return null;
    return unemploymentRank(selectedCounty.fips, mapDemographics.unemploymentByFips);
  }, [selectedCounty, mapDemographics.unemploymentByFips]);

  const secondaryStats = useMemo(() => {
    if (!snapshot) return [];
    const items: { icon: typeof Wallet; label: string; value: string; hint?: string }[] = [];

    if (snapshot.medianHouseholdIncome != null && snapshot.medianHouseholdIncome > 0) {
      items.push({
        icon: Wallet,
        label: "Median income",
        value: formatIncome(snapshot.medianHouseholdIncome),
        hint: "Census ACS",
      });
    }
    if (snapshot.laborForce != null && snapshot.laborForce > 0) {
      items.push({
        icon: Briefcase,
        label: "Labor force",
        value: snapshot.laborForce.toLocaleString(),
        hint: "WisConomy",
      });
    }
    if (snapshot.featuredEconomy) {
      items.push({
        icon: Briefcase,
        label: "Open jobs",
        value: snapshot.featuredEconomy.openJobs.toLocaleString(),
        hint: "Estimate",
      });
      items.push({
        icon: Wallet,
        label: "Median wage",
        value: `$${Math.round(snapshot.featuredEconomy.medianWage / 1000)}k`,
        hint: "QCEW proxy",
      });
    }
    if (
      snapshot.choroplethFormatted &&
      snapshot.choroplethMetric &&
      snapshot.choroplethMetric !== "unemployment"
    ) {
      items.push({
        icon: TrendingDown,
        label: metricLabelForExplorer(snapshot.choroplethMetric),
        value: snapshot.choroplethFormatted,
        hint: "Map layer",
      });
    }
    return items;
  }, [snapshot]);

  return (
    <AnimatePresence>
      {selectedCounty && snapshot && (
        <motion.div
          key={selectedCounty.fips}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "pointer-events-none fixed z-30",
            // Anchored to the dock's live measured height (--dock-total, set by
            // MapChatWidget's ResizeObserver) — never slides under the dock.
            "inset-x-3 bottom-[calc(var(--dock-total,10rem)+0.5rem)] max-h-[min(50dvh,520px)]",
            "sm:inset-x-auto sm:bottom-auto sm:left-4 sm:top-[4.5rem] sm:max-h-[calc(100dvh-8rem)] lg:top-20",
            "w-auto sm:w-[min(340px,calc(100vw-2rem))]",
            className
          )}
        >
          <AnswerCard className="flex max-h-[inherit] flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300/70">
                  County
                </p>
                <h2 className="font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[22px]">
                  {snapshot.shortName}
                </h2>
                {snapshot.population ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/55">
                    <Users className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    {formatPopulation(snapshot.population, {
                      estimate: snapshot.populationIsEstimate,
                    })}
                    {snapshot.populationIsEstimate ? " (est.)" : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => clearSelectedCounty()}
                className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/55 transition-colors hover:bg-white/14 hover:text-white"
                aria-label="Close county panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 py-3.5">
              {/* Hero unemployment */}
              {snapshot.unemploymentRate != null && (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-4 py-3.5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Unemployment
                      </p>
                      <p className="font-display text-[32px] font-bold tabular-nums leading-none text-white">
                        {snapshot.unemploymentRate.toFixed(1)}%
                      </p>
                    </div>
                    {uRank && (
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                          Statewide
                        </p>
                        <p className="font-display text-lg font-bold tabular-nums text-cyan-200">
                          #{uRank.rank}
                          <span className="text-sm font-medium text-white/45">
                            {" "}
                            / {uRank.total}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-white/35">
                    Wisconsin DWD WisConomy · BLS LAUS
                  </p>
                </div>
              )}

              {/* Secondary stats — single grid, no duplicates */}
              {secondaryStats.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {secondaryStats.map((stat) => (
                    <StatTile key={stat.label} {...stat} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-white/8 px-4 py-2.5">
              <p className="flex items-center gap-1 text-[10px] leading-relaxed text-white/35">
                <span>Tap another county to compare</span>
                <ChevronRight className="h-3 w-3 opacity-50" />
              </p>
              <p className="mt-1 text-[9px] text-white/25">
                <a
                  href="https://www.census.gov/programs-surveys/acs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-200 hover:underline"
                >
                  Census ACS
                </a>
                {" · "}
                <a
                  href="https://jobcenterofwisconsin.com/wisconomy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-200 hover:underline"
                >
                  WisConomy
                </a>
              </p>
            </div>
          </AnswerCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300/60" />
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-white/45">
          {label}
        </p>
      </div>
      <p className="mt-1.5 font-display text-[17px] font-bold tabular-nums leading-none text-white">
        {value}
      </p>
      {hint && <p className="mt-1 text-[9px] text-white/30">{hint}</p>}
    </div>
  );
}
