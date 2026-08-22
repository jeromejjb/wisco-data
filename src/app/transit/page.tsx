"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, Share2, Bookmark, Bus, MapPin } from "lucide-react";
import { RouteCard, RouteTimeline } from "@/components/transit/route-card";
import { WorkwaysMap } from "@/components/map/workways-map";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourcePanel, PageHero } from "@/components/data/source-panel";
import { LiveBadge } from "@/components/ui/live-badge";
import { Skeleton } from "@/components/ui/states";
import { useTransitData } from "@/hooks/use-live-data";
import { useEffect, useState as useReactState } from "react";
import type { Job } from "@/lib/types";

function TransitContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");
  const destParam = searchParams.get("dest");
  const [job, setJob] = useReactState<Job | undefined>();

  useEffect(() => {
    if (jobId) {
      fetch(`/api/jobs`)
        .then((r) => r.json())
        .then((json) => {
          const found = json.data?.find((j: Job) => j.id === jobId);
          setJob(found);
        });
    }
  }, [jobId]);

  const { data, isLoading } = useTransitData("Home", "Workplace");
  const transit = data?.data;
  const provenance = data?.provenance;

  const origin = transit?.origin;
  const destination = destParam ?? job?.location.address ?? "9200 W Wisconsin Ave, Milwaukee, WI";
  const routes = transit?.routes ?? [];
  const alerts = transit?.alerts ?? [];
  const agencies = transit?.agencies ?? [];
  const stops = transit?.stops ?? [];

  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id);
  const [timeMode, setTimeMode] = useState<"leave" | "arrive">("arrive");

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  const markers = [
    origin && {
      id: "origin",
      coordinates: origin.coordinates,
      color: "#267a55",
    },
    {
      id: "dest",
      coordinates: job?.location.coordinates ?? { lat: 43.0382, lng: -88.0289 },
      color: "#d4824a",
      selected: true,
    },
    ...stops.slice(0, 30).map((s) => ({
      id: s.id,
      coordinates: { lat: s.lat, lng: s.lng },
      color: "#1e6b9c33",
    })),
  ].filter(Boolean) as { id: string; coordinates: { lat: number; lng: number }; color?: string; selected?: boolean }[];

  return (
    <div>
      <PageHero
        eyebrow="Official GTFS feeds"
        title="Transit to Work"
        description="Plan trips using live MCTS and Madison Metro GTFS stop inventory, route data, and Madison GTFS-Realtime service alerts."
      >
        {transit?.stats && (
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {transit.stats.totalStops.toLocaleString()} live stops</span>
            <span className="flex items-center gap-1.5"><Bus className="h-4 w-4" /> {transit.stats.totalRoutes} routes · {transit.stats.agencies} agencies</span>
            <LiveBadge label="GTFS live" />
          </div>
        )}
      </PageHero>

      <div className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
        {job && !job.isOpen && (
          <div className="mb-6 glass-panel rounded-2xl border-amber-200/50 bg-amber-50/80 p-5 dark:bg-amber-900/20">
            <p className="font-semibold">This job is no longer accepting applications</p>
            <p className="mt-1 text-sm text-muted-foreground">You can still plan a commute to this workplace.</p>
            <Link href="/jobs" className="mt-2 inline-block text-sm font-semibold text-lake-600 hover:underline">Explore nearby jobs</Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <Card className="glass-panel border-0 shadow-lg">
              <CardHeader><CardTitle className="font-display">Trip planner</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label htmlFor="origin">From</Label><Input id="origin" defaultValue={origin?.address} className="mt-1.5 rounded-xl" /></div>
                <div><Label htmlFor="dest">To</Label><Input id="dest" defaultValue={destination} className="mt-1.5 rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>When</Label>
                    <Select value={timeMode} onChange={(e) => setTimeMode(e.target.value as "leave" | "arrive")} className="mt-1.5 rounded-xl">
                      <option value="leave">Leave at</option>
                      <option value="arrive">Arrive by</option>
                    </Select>
                  </div>
                  <div><Label htmlFor="time">Time</Label><Input id="time" type="time" defaultValue="07:30" className="mt-1.5 rounded-xl" /></div>
                </div>
                <Button className="w-full rounded-2xl">Find routes</Button>
              </CardContent>
            </Card>

            {agencies.map((a) => (
              <div key={a.id} className="glass-panel rounded-2xl p-4">
                <p className="font-semibold">{a.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.stopCount.toLocaleString()} stops · {a.routeCount} routes</p>
              </div>
            ))}

            {alerts.map((alert) => (
              <div key={alert.id} className="glass-panel rounded-2xl p-4 text-sm">
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-1 text-muted-foreground">{alert.description}</p>
                <p className="mt-2 text-xs text-lake-600">{alert.agency}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4 lg:col-span-3">
            {isLoading ? (
              <Skeleton className="h-[360px] w-full rounded-3xl" />
            ) : (
              <WorkwaysMap center={job?.location.coordinates ?? origin?.coordinates} zoom={12} markers={markers} className="h-[360px] shadow-xl" />
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-xl"><Bookmark className="h-4 w-4" /> Save</Button>
              <Button variant="outline" size="sm" className="rounded-xl"><Share2 className="h-4 w-4" /> Share</Button>
              <Button variant="outline" size="sm" className="rounded-xl"><Calendar className="h-4 w-4" /> Calendar</Button>
            </div>

            <h2 className="font-display text-lg font-bold">Route options</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} selected={route.id === selectedRouteId} onSelect={() => setSelectedRouteId(route.id)} />
              ))}
            </div>

            {selectedRoute && (
              <Card className="glass-panel border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Clock className="h-5 w-5" /> {selectedRoute.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RouteTimeline route={selectedRoute} />
                </CardContent>
              </Card>
            )}

            {provenance && <SourcePanel provenance={provenance} activeSources={["gtfs-mcts", "gtfs-madison"]} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransitPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading planner…</div>}>
      <TransitContent />
    </Suspense>
  );
}
