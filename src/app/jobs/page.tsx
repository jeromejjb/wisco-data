"use client";

import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { JobsStatusBanner } from "@/components/jobs/jobs-status-banner";
import { JobCard, JobFilters } from "@/components/jobs/job-card";
import { WorkwaysMap } from "@/components/map/workways-map";
import { EmptyState } from "@/components/ui/states";
import { SourcePanel } from "@/components/data/source-panel";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/ui/live-badge";
import { useJobsData } from "@/hooks/use-live-data";
import { Briefcase } from "lucide-react";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { messagesForContext } from "@/lib/loading-messages";
import { useRotatingMessage } from "@/hooks/use-rotating-message";
import { Skeleton } from "@/components/ui/states";

function JobsContent() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | boolean | number | undefined>>({
    keyword: searchParams.get("q") ?? undefined,
    transitOnly: searchParams.get("transit") === "true" || undefined,
    maxCommute: searchParams.get("maxCommute") ? Number(searchParams.get("maxCommute")) : 45,
    rankByReach: searchParams.get("rank") === "true" || undefined,
  });

  const apiParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (filters.keyword) p.q = String(filters.keyword);
    if (filters.transitOnly) p.transit = "true";
    if (filters.maxCommute) p.maxCommute = String(filters.maxCommute);
    if (filters.rankByReach) p.rank = "true";
    if (filters.industry) p.industry = String(filters.industry);
    return p;
  }, [filters]);

  const { data, isLoading, error } = useJobsData(apiParams);
  const jobs = data?.data ?? [];
  const loadingLine = useRotatingMessage(isLoading ? messagesForContext("jobs") : [], 2600);
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? jobs[0];

  const markers = jobs.map((j) => ({
    id: j.id,
    coordinates: j.location.coordinates,
    selected: j.id === selectedJob?.id,
    color: j.transitAccessible ? "#1e6b9c" : "#d4824a",
  }));

  function handleFilterChange(key: string, value: string | boolean | number | undefined) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background lg:flex-row">
      <div className="flex w-full flex-col border-r border-border lg:w-[440px] xl:w-[500px]">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">Find Jobs</h1>
                <LiveBadge label="Live" className="!py-0.5 !text-[10px]" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading ? loadingLine : `${jobs.length} results`}
                {!isLoading && data?.meta?.liveCount ? ` · ${data.meta.liveCount} from live APIs` : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
          {data?.meta && <JobsStatusBanner meta={data.meta} />}
        </div>

        <div className="hidden border-b border-border p-5 lg:block">
          <JobFilters filters={filters} onChange={handleFilterChange} />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              <DataGatheringLoader
                messages={messagesForContext("jobs")}
                variant="light"
                subtitle="We're querying Adzuna and USAJobs for Wisconsin openings"
                className="rounded-2xl border border-border bg-muted/30 p-4"
              />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          ) : error ? (
            <EmptyState
              title="Could not load jobs"
              description="Live job APIs are temporarily unavailable. Try again shortly."
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-10 w-10" />}
              title={
                data?.meta?.status === "failed"
                  ? "Job listings unavailable"
                  : data?.meta?.status === "unconfigured"
                    ? "Live jobs not configured"
                    : "No matching jobs"
              }
              description={
                data?.meta?.userMessage ??
                "No matching jobs are reachable within your commute window. Try expanding your commute window or changing filters."
              }
            />
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={() => setSelectedId(job.id)}
              />
            ))
          )}
        </div>

        {data?.provenance && (
          <div className="hidden border-t border-border p-4 lg:block">
            <SourcePanel provenance={data.provenance} activeSources={["usajobs", "gtfs-mcts"]} compact />
          </div>
        )}
      </div>

      <div className="relative min-h-[45vh] flex-1">
        {isLoading ? (
          <div className="flex h-full min-h-[45vh] items-center justify-center bg-muted/20 p-6 lg:min-h-full">
            <DataGatheringLoader
              messages={messagesForContext("jobs")}
              variant="light"
              subtitle="Plotting listings on the map as they arrive"
              className="max-w-sm rounded-2xl border border-border bg-background/90 p-5 shadow-sm"
            />
          </div>
        ) : (
          <WorkwaysMap
            center={selectedJob?.location.coordinates ?? { lat: 43.5, lng: -89.0 }}
            zoom={selectedJob ? 11 : 7}
            markers={markers}
            onMarkerClick={setSelectedId}
            className="h-full min-h-[45vh] rounded-none lg:min-h-full"
          />
        )}

        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-4 left-4 right-4 lg:hidden"
            >
              <div className="glass-panel rounded-3xl p-1 shadow-2xl">
                <JobCard job={selectedJob} selected />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-bold">Filters</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileFiltersOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <JobFilters filters={filters} onChange={handleFilterChange} />
            <Button className="mt-6 w-full rounded-2xl" onClick={() => setMobileFiltersOpen(false)}>
              Show {jobs.length} jobs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading jobs…</div>}>
      <JobsContent />
    </Suspense>
  );
}
