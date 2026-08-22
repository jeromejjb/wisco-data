"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  MousePointerClick,
  Eye,
  RefreshCw,
  Trophy,
  MapPin,
  FlaskConical,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPromptExperimentStats } from "@/lib/agent/prompt-experiments";
import { useMemo } from "react";

type VariantRow = {
  experimentId: string;
  variant: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

type DashboardResponse = {
  definitions: {
    id: string;
    name: string;
    description: string;
    variants: { id: string; label: string; example: string }[];
  }[];
  stats: {
    variants: VariantRow[];
    areas: { areaId: string; impressions: number; clicks: number; ctr: number }[];
    starters: {
      starterId: string;
      experimentId: string;
      variant: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }[];
    winners: Record<string, string | null>;
    totalEvents: number;
    totalImpressions: number;
    totalClicks: number;
    overallCtr: number;
  };
  recentEvents: {
    experimentId: string;
    variant: string;
    action: string;
    starterId: string;
    areaId: string;
    at: string;
  }[];
  generatedAt: string;
  storageNote: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Eye;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lake-600/10 text-lake-700 dark:text-lake-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExperimentsDashboard() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get("key");
  const apiUrl = adminKey
    ? `/api/prompt-experiments?key=${encodeURIComponent(adminKey)}`
    : "/api/prompt-experiments";

  const { data, error, isLoading, mutate, isValidating } = useSWR<DashboardResponse>(
    apiUrl,
    fetcher,
    { refreshInterval: 15_000 }
  );

  const localStats = useMemo(() => getPromptExperimentStats(), [data?.generatedAt]);

  const agg = data?.stats;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-lake-700 text-white shadow-lg">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
                Prompt experiments
              </h1>
              <p className="text-sm text-muted-foreground">
                A/B tests for localized chat starters on the home map
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          disabled={isValidating}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isValidating && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="py-4 text-sm text-red-700 dark:text-red-300">
            Could not load server stats
            {process.env.NODE_ENV === "development" ? `: ${error.message}` : ""}. Set{" "}
            <code className="rounded bg-black/5 px-1">ADMIN_SECRET</code> in .env if the API is
            protected, and pass <code className="rounded bg-black/5 px-1">?key=…</code> or{" "}
            <code className="rounded bg-black/5 px-1">Authorization: Bearer …</code>.
          </CardContent>
        </Card>
      )}

      {isLoading && !data && (
        <p className="text-sm text-muted-foreground">Loading experiment data…</p>
      )}

      {agg && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total events" value={agg.totalEvents} icon={BarChart3} />
            <StatCard label="Impressions" value={agg.totalImpressions} icon={Eye} />
            <StatCard
              label="Clicks"
              value={agg.totalClicks}
              sub={`CTR ${pct(agg.overallCtr)}`}
              icon={MousePointerClick}
            />
            <StatCard
              label="Active tests"
              value={data.definitions.length}
              sub="Local jobs & economy wording"
              icon={FlaskConical}
            />
          </div>

          <p className="mb-6 text-xs text-muted-foreground">{data.storageNote}</p>

          {data.definitions.map((def) => {
            const rows = agg.variants.filter((v) => v.experimentId === def.id);
            const winner = agg.winners[def.id];

            return (
              <Card key={def.id} className="mb-8 overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">{def.name}</CardTitle>
                    <Badge variant="muted">{def.id}</Badge>
                    {winner && (
                      <Badge variant="accent" className="gap-1">
                        <Trophy className="h-3 w-3" />
                        Leading: {winner}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{def.description}</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Variant</th>
                          <th className="px-4 py-3 font-medium">Example prompt</th>
                          <th className="px-4 py-3 text-right font-medium">Impressions</th>
                          <th className="px-4 py-3 text-right font-medium">Clicks</th>
                          <th className="px-4 py-3 text-right font-medium">CTR</th>
                          <th className="px-4 py-3 font-medium">Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {def.variants.map((v) => {
                          const row = rows.find((r) => r.variant === v.id);
                          const impressions = row?.impressions ?? 0;
                          const clicks = row?.clicks ?? 0;
                          const rowCtr = row?.ctr ?? 0;
                          const maxCtr = Math.max(...rows.map((r) => r.ctr), 0.001);
                          const barPct = (rowCtr / maxCtr) * 100;
                          const isWinner = winner === v.id;

                          return (
                            <tr
                              key={v.id}
                              className={cn(
                                "border-b border-border/40 last:border-0",
                                isWinner && "bg-forest-600/5"
                              )}
                            >
                              <td className="px-4 py-3 font-mono text-xs">
                                {v.id}
                                {isWinner && (
                                  <Trophy className="ml-1 inline h-3.5 w-3.5 text-forest-600" />
                                )}
                              </td>
                              <td className="max-w-xs px-4 py-3 text-muted-foreground">
                                {v.example}
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{impressions}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{clicks}</td>
                              <td className="px-4 py-3 text-right font-medium tabular-nums">
                                {pct(rowCtr)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      isWinner ? "bg-forest-600" : "bg-lake-600/70"
                                    )}
                                    style={{ width: `${barPct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {rows.every((r) => r.impressions < 5) && (
                    <p className="border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
                      Need at least 5 impressions per variant to declare a winner.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-lake-600" />
                  By area
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agg.areas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No area data yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {agg.areas.slice(0, 12).map((a) => (
                      <li
                        key={a.areaId}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span className="font-medium capitalize">{a.areaId.replace(/-/g, " ")}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {a.clicks} clicks · {pct(a.ctr)} CTR
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent events</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events yet. Open the home map and click starter chips to generate data.
                  </p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
                    {data.recentEvents.map((e, i) => (
                      <li
                        key={`${e.at}-${i}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
                      >
                        <Badge variant={e.action === "click" ? "accent" : "muted"}>
                          {e.action}
                        </Badge>
                        <span className="font-mono text-muted-foreground">
                          {e.experimentId}:{e.variant}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span>{e.areaId}</span>
                        <span className="ml-auto text-muted-foreground">
                          {new Date(e.at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {Object.keys(localStats).length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base">This browser (localStorage)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Events recorded in your browser only — useful when testing locally before server
                  events accumulate.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(localStats).map(([key, s]) => (
                    <span
                      key={key}
                      className="rounded-lg bg-muted px-3 py-1.5 font-mono text-xs"
                    >
                      {key}: {s.impressions} imp / {s.clicks} clk
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            Last updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
