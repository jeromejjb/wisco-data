"use client";

import { useMemo, useState } from "react";
import {
  StatCard,
  UnemploymentChart,
  IndustryTreemap,
  OpportunityIndex,
  CountyCompareRow,
} from "@/components/charts/economy-charts";
import { WorkwaysMap } from "@/components/map/workways-map";
import { MapLegend } from "@/components/map/map-legend";
import { SourcePanel, PageHero } from "@/components/data/source-panel";
import { LiveBadge } from "@/components/ui/live-badge";
import { Skeleton } from "@/components/ui/states";
import { useEconomyData } from "@/hooks/use-live-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { EconomyMetric } from "@/lib/types";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const layerOptions: { id: EconomyMetric; label: string; metric: ChoroplethMetric }[] = [
  { id: "unemployment", label: "Unemployment", metric: "unemployment" },
  { id: "job-openings", label: "Job openings", metric: "open-jobs" },
  { id: "median-wage", label: "Median wage", metric: "median-wage" },
];

export default function ExplorePage() {
  const { data, isLoading, error } = useEconomyData();
  const [activeLayer, setActiveLayer] = useState<EconomyMetric>("unemployment");
  const [compareLeft, setCompareLeft] = useState("milwaukee");
  const [compareRight, setCompareRight] = useState("dane");

  const economy = data?.data;
  const counties = useMemo(() => economy?.counties ?? [], [economy?.counties]);
  const stats = economy?.statewide;
  const leftCounty = counties.find((c) => c.id === compareLeft);
  const rightCounty = counties.find((c) => c.id === compareRight);
  const active = layerOptions.find((l) => l.id === activeLayer) ?? layerOptions[0]!;

  const choroplethValues = useMemo(() => {
    if (active.id === "unemployment" && economy?.unemploymentByFips) {
      return economy.unemploymentByFips;
    }
    const values: Record<string, number> = {};
    for (const c of counties) {
      if (active.id === "median-wage" && c.medianWage != null) values[c.fips] = c.medianWage;
      if (active.id === "job-openings" && c.openJobs != null) values[c.fips] = c.openJobs;
    }
    return values;
  }, [active.id, counties, economy?.unemploymentByFips]);

  const avgOpportunity = counties.length
    ? Math.round(counties.reduce((s, c) => s + c.opportunityIndex, 0) / counties.length)
    : 72;

  return (
    <div>
      <PageHero
        eyebrow="Live economic intelligence"
        title="Explore Wisconsin's economy"
        description="County-level unemployment from Wisconsin DWD WisConomy, employment and wages from BLS QCEW, and state trends from BLS LAUS — updated on every load."
      >
        <LiveBadge label="BLS + WisConomy live" />
      </PageHero>

      <div className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-[480px] w-full rounded-3xl" />
          </div>
        ) : error || !economy ? (
          <div className="glass-panel rounded-3xl p-12 text-center">
            <p className="font-display text-xl font-bold">Unable to load live economic data</p>
            <p className="mt-2 text-muted-foreground">Check your connection and refresh. BLS and WisConomy feeds may be temporarily unavailable.</p>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <OpportunityIndex score={avgOpportunity} />
              {stats && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.unemploymentRate != null && (
                    <StatCard label="Unemployment" value={formatPercent(stats.unemploymentRate)} live />
                  )}
                  {stats.openJobs != null && (
                    <StatCard label="Est. openings" value={stats.openJobs.toLocaleString()} live />
                  )}
                  {stats.medianWage != null && (
                    <StatCard label="Median wage" value={formatCurrency(stats.medianWage)} live />
                  )}
                  {stats.laborForceParticipation != null && (
                    <StatCard label="LFPR" value={formatPercent(stats.laborForceParticipation)} live />
                  )}
                </div>
              )}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {layerOptions.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeLayer === layer.id
                      ? "bg-lake-600 text-white shadow-lg shadow-lake-600/25"
                      : "glass-panel hover:bg-muted/80"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="relative">
                  <WorkwaysMap
                    center={{ lat: 44.2, lng: -89.5 }}
                    zoom={6.5}
                    choroplethMetric={active.metric}
                    choroplethValues={choroplethValues}
                    className="h-[500px] shadow-xl"
                  />
                  <MapLegend metric={active.metric} className="absolute bottom-4 left-4 z-10" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {Object.keys(choroplethValues).length} counties · {active.label} · WisConomy + QCEW where available
                </p>
              </div>
              {data?.provenance && (
                <SourcePanel provenance={data.provenance} activeSources={["bls", "dwd", "census", "fred"]} />
              )}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card className="glass-panel border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    Unemployment trend
                    <LiveBadge label="BLS" className="!py-0.5 !text-[10px]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UnemploymentChart data={economy.unemploymentTrend.filter((d) => d.us !== null) as { month: string; wi: number; us: number }[]} />
                </CardContent>
              </Card>
              <Card className="glass-panel border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    Industry employment share
                    <LiveBadge label="QCEW" className="!py-0.5 !text-[10px]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IndustryTreemap data={economy.industryBreakdown} />
                </CardContent>
              </Card>
            </div>

            {leftCounty && rightCounty && (
              <Card className="mt-10 glass-panel border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="font-display">Geographic comparison</CardTitle>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select value={compareLeft} onChange={(e) => setCompareLeft(e.target.value)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium">
                      {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <span className="text-muted-foreground">vs</span>
                    <select value={compareRight} onChange={(e) => setCompareRight(e.target.value)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium">
                      {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <CountyCompareRow metric="Unemployment" left={{ name: leftCounty.name, value: leftCounty.unemploymentRate }} right={{ name: rightCounty.name, value: rightCounty.unemploymentRate }} format={(v) => formatPercent(v)} />
                  <CountyCompareRow metric="Median wage" left={{ name: leftCounty.name, value: leftCounty.medianWage ?? 0 }} right={{ name: rightCounty.name, value: rightCounty.medianWage ?? 0 }} format={(v) => (v ? formatCurrency(v) : "—")} />
                  <CountyCompareRow metric="Est. openings" left={{ name: leftCounty.name, value: leftCounty.openJobs ?? 0 }} right={{ name: rightCounty.name, value: rightCounty.openJobs ?? 0 }} format={(v) => (v ? v.toLocaleString() : "—")} />
                  <CountyCompareRow metric="Opportunity Index" left={{ name: leftCounty.name, value: leftCounty.opportunityIndex }} right={{ name: rightCounty.name, value: rightCounty.opportunityIndex }} />
                </CardContent>
              </Card>
            )}

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {counties.map((county) => (
                <Card key={county.id} className="glass-panel border-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <h3 className="font-display font-bold">{county.name}</h3>
                      <Badge variant="default">Index {county.opportunityIndex}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Unemployment</p><p className="font-semibold tabular-nums">{formatPercent(county.unemploymentRate)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Median wage</p><p className="font-semibold tabular-nums">{county.medianWage != null ? formatCurrency(county.medianWage, true) : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Est. openings</p><p className="font-semibold tabular-nums">{county.openJobs != null ? county.openJobs.toLocaleString() : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Labor force</p><p className="font-semibold tabular-nums">{county.laborForceParticipation != null ? formatPercent(county.laborForceParticipation) : "—"}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
