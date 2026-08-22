"use client";

import { useState } from "react";
import {
  StatCard,
  UnemploymentChart,
  IndustryTreemap,
  OpportunityIndex,
  CountyCompareRow,
} from "@/components/charts/economy-charts";
import { WorkwaysMap } from "@/components/map/workways-map";
import { SourcePanel, PageHero } from "@/components/data/source-panel";
import { LiveBadge } from "@/components/ui/live-badge";
import { Skeleton } from "@/components/ui/states";
import { useEconomyData } from "@/hooks/use-live-data";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { EconomyMetric } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const layerOptions: { id: EconomyMetric; label: string }[] = [
  { id: "unemployment", label: "Unemployment" },
  { id: "job-openings", label: "Job openings" },
  { id: "median-wage", label: "Median wage" },
  { id: "transit-coverage", label: "Transit coverage" },
  { id: "transit-jobs", label: "Transit-accessible jobs" },
];

export default function ExplorePage() {
  const { data, isLoading, error } = useEconomyData();
  const [activeLayer, setActiveLayer] = useState<EconomyMetric>("unemployment");
  const [compareLeft, setCompareLeft] = useState("milwaukee");
  const [compareRight, setCompareRight] = useState("dane");

  const economy = data?.data;
  const counties = economy?.counties ?? [];
  const stats = economy?.statewide;
  const leftCounty = counties.find((c) => c.id === compareLeft);
  const rightCounty = counties.find((c) => c.id === compareRight);

  const mapMarkers = counties.map((c) => ({
    id: c.id,
    coordinates: c.coordinates,
    color:
      activeLayer === "unemployment"
        ? c.unemploymentRate > 3.5 ? "#d4824a" : "#1e6b9c"
        : activeLayer === "median-wage"
          ? "#267a55"
          : "#1e6b9c",
  }));

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
                  <StatCard label="Unemployment" value={formatPercent(stats.unemploymentRate)} live />
                  <StatCard label="Est. openings" value={stats.openJobs.toLocaleString()} live />
                  <StatCard label="Median wage" value={formatCurrency(stats.medianWage)} live />
                  <StatCard label="LFPR" value={formatPercent(stats.laborForceParticipation)} live />
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
                <WorkwaysMap
                  center={{ lat: 44.2, lng: -89.5 }}
                  zoom={6.5}
                  markers={mapMarkers}
                  className="h-[500px] shadow-xl"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Live county markers · {layerOptions.find((l) => l.id === activeLayer)?.label} · QCEW + WisConomy
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
                  <CountyCompareRow metric="Median wage" left={{ name: leftCounty.name, value: leftCounty.medianWage }} right={{ name: rightCounty.name, value: rightCounty.medianWage }} format={(v) => formatCurrency(v)} />
                  <CountyCompareRow metric="Est. openings" left={{ name: leftCounty.name, value: leftCounty.openJobs }} right={{ name: rightCounty.name, value: rightCounty.openJobs }} format={(v) => v.toLocaleString()} />
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
                      <div><p className="text-xs text-muted-foreground">Median wage</p><p className="font-semibold tabular-nums">{formatCurrency(county.medianWage, true)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Est. openings</p><p className="font-semibold tabular-nums">{county.openJobs.toLocaleString()}</p></div>
                      <div><p className="text-xs text-muted-foreground">Transit jobs</p><p className="font-semibold tabular-nums">{formatPercent(county.transitAccessibleJobShare)}</p></div>
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
