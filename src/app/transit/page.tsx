"use client";

import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bus, Layers, MapPin, Radio, RefreshCw } from "lucide-react";
import { RouteCard, RouteTimeline } from "@/components/transit/route-card";
import { TransitDetailSheet } from "@/components/transit/transit-detail-sheet";
import type { TransitMapSelection } from "@/components/transit/transit-map";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourcePanel, PageHero } from "@/components/data/source-panel";
import { LiveBadge } from "@/components/ui/live-badge";
import { Skeleton } from "@/components/ui/states";
import { useTransitMapData } from "@/hooks/use-transit-map-data";
import {
  TRANSIT_AGENCY_LIST,
  type TransitAgencyId,
  isTransitAgencyId,
} from "@/lib/transit-agencies";
import { cn } from "@/lib/utils";

const TransitMap = dynamic(
  () => import("@/components/transit/transit-map").then((m) => m.TransitMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[min(52vh,420px)] w-full rounded-2xl" />,
  }
);

function TransitContent() {
  const searchParams = useSearchParams();
  const agencyParam = searchParams.get("agency");
  const destParam = searchParams.get("dest");
  const jobParam = searchParams.get("job");

  const [agency, setAgency] = useState<TransitAgencyId | "all">(
    agencyParam === "all"
      ? "all"
      : agencyParam && isTransitAgencyId(agencyParam)
        ? agencyParam
        : "mcts"
  );
  const [originInput, setOriginInput] = useState("Milwaukee Intermodal Station");
  const [destInput, setDestInput] = useState(destParam ?? jobParam ?? "");
  const [selection, setSelection] = useState<TransitMapSelection | null>(null);
  const [layerToggles, setLayerToggles] = useState({ routes: true, stops: true, vehicles: true });

  const { data, isLoading, mutate, isValidating } = useTransitMapData({
    agency,
    origin: originInput,
    destination: destInput,
    pollRealtime: true,
  });

  const transit = data?.data;
  const provenance = data?.provenance;
  const routes = transit?.routes ?? [];
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();

  const mapCenter = useMemo(
    () => transit?.mapCenter ?? TRANSIT_AGENCY_LIST.find((a) => a.id === agency)?.center ?? TRANSIT_AGENCY_LIST[0]!.center,
    [transit?.mapCenter, agency]
  );

  const mapZoom = transit?.mapZoom ?? 12;

  const stats = {
    totalStops: transit?.stops.length,
    routeShapes: transit?.shapes.length,
    liveVehicles: transit?.vehicles.length,
  };

  return (
    <div>
      <PageHero
        eyebrow="Wisconsin transit · GTFS + realtime"
        title="Transit to Work"
        description="Route lines, stops, and live vehicle positions from official GTFS feeds — optimized for mobile and desktop."
      >
        {transit?.stats && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {transit.stops.length.toLocaleString()} stops on map
            </span>
            <span className="flex items-center gap-1.5">
              <Bus className="h-4 w-4" /> {transit.shapes.length} route lines
            </span>
            <span className="flex items-center gap-1.5">
              <Radio className="h-4 w-4" /> {transit.vehicles.length} live vehicles
            </span>
            <LiveBadge label={isValidating ? "Updating…" : "GTFS live"} />
          </div>
        )}
      </PageHero>

      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Sidebar — stacks above map on mobile */}
          <div className="space-y-4 lg:col-span-4 xl:col-span-3">
            <Card className="glass-panel border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg">Metro & agency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agency">Transit system</Label>
                  <Select
                    id="agency"
                    value={agency}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAgency(isTransitAgencyId(v) ? v : "mcts");
                      setSelection(null);
                    }}
                    className="mt-1.5 rounded-xl"
                  >
                    {TRANSIT_AGENCY_LIST.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.shortName}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="origin">From</Label>
                  <Input
                    id="origin"
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="dest">To</Label>
                  <Input
                    id="dest"
                    value={destInput}
                    onChange={(e) => setDestInput(e.target.value)}
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <Button
                  className="w-full rounded-2xl"
                  onClick={() => {
                    void mutate();
                    setSelectedRouteId(routes[0]?.id);
                  }}
                >
                  Refresh map & routes
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-panel border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Layers className="h-4 w-4" /> Map layers
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(
                  [
                    ["routes", "Route lines"],
                    ["stops", "Stops"],
                    ["vehicles", "Live buses"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLayerToggles((l) => ({ ...l, [key]: !l[key] }))}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      layerToggles[key]
                        ? "bg-lake-600 text-white"
                        : "bg-black/5 text-muted-foreground dark:bg-white/10"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void mutate()}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-lake-600"
                >
                  <RefreshCw className={cn("h-3 w-3", isValidating && "animate-spin")} />
                  Sync
                </button>
              </CardContent>
            </Card>

            <TransitDetailSheet
              selection={selection}
              alerts={transit?.alerts ?? []}
              stats={stats}
              onClose={() => setSelection(null)}
            />

            {(transit?.allAgencies ?? transit?.agencies ?? []).slice(0, 6).map((a) => (
              <div key={a.id} className="glass-panel rounded-2xl p-4 text-sm">
                <p className="font-semibold">{a.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {a.stopCount.toLocaleString()} stops · {a.routeCount} routes
                  {a.hasRealtime ? " · realtime" : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Map + routes */}
          <div className="space-y-4 lg:col-span-8 xl:col-span-9">
            <div className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
              {isLoading ? (
                <Skeleton className="h-[min(52vh,420px)] w-full" />
              ) : (
                <TransitMap
                  center={mapCenter}
                  zoom={mapZoom}
                  shapes={transit?.shapes}
                  stops={transit?.stops}
                  vehicles={transit?.vehicles}
                  selectedId={selection?.item.id}
                  onSelect={setSelection}
                  layers={layerToggles}
                  className="rounded-none"
                />
              )}
            </div>

            <div className="lg:hidden">
              <TransitDetailSheet
                selection={selection}
                alerts={transit?.alerts ?? []}
                stats={stats}
                onClose={() => setSelection(null)}
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold">Trip planner</h2>
                <p className="text-xs text-muted-foreground">Live map is GTFS — itineraries need a router</p>
              </div>
              {routes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {routes.map((route) => (
                    <RouteCard
                      key={route.id}
                      route={route}
                      selected={route.id === (selectedRouteId ?? routes[0]?.id)}
                      onSelect={() => setSelectedRouteId(route.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="glass-panel border-0">
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Point-to-point trip cards are off until a transit router is connected. Use the map
                    for live vehicles, stops, and route shapes
                    {destInput ? ` toward ${destInput}` : ""}.
                  </CardContent>
                </Card>
              )}
            </div>

            {routes[0] && (
              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="font-display">
                    {(routes.find((r) => r.id === selectedRouteId) ?? routes[0]).label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteTimeline route={routes.find((r) => r.id === selectedRouteId) ?? routes[0]!} />
                </CardContent>
              </Card>
            )}

            {provenance && (
              <SourcePanel
                provenance={provenance}
                activeSources={["gtfs-mcts", "gtfs-madison"]}
              />
            )}

            <p className="text-center text-xs text-muted-foreground">
              Need jobs near transit?{" "}
              <Link href="/jobs?transit=true" className="font-semibold text-lake-600 hover:underline">
                Browse transit-accessible listings
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransitPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading transit map…</div>}>
      <TransitContent />
    </Suspense>
  );
}
