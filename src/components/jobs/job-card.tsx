"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bookmark,
  Bus,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import type { Job } from "@/lib/types";
import { cn, formatCurrency, formatDuration } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function formatPay(job: Job) {
  if (!job.payMin) return "Pay not listed";
  const min = job.payType === "hourly" ? job.payMin : job.payMin;
  const max = job.payMax;
  const suffix = job.payType === "hourly" ? "/hr" : "/yr";
  if (max) {
    const fmt = (n: number) =>
      job.payType === "hourly" ? `$${n.toFixed(0)}` : formatCurrency(n, true);
    return `${fmt(min)} – ${fmt(max)}${suffix}`;
  }
  return job.payType === "hourly"
    ? `$${min}/hr`
    : `${formatCurrency(min, true)}/yr`;
}

export function JobCard({
  job,
  selected,
  onSelect,
}: {
  job: Job;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { savedJobs, toggleSaveJob } = useAppStore();
  const saved = savedJobs.includes(job.id);

  return (
    <motion.div layout initial={false}>
      <Card
        className={cn(
          "cursor-pointer overflow-hidden border-0 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-xl",
          selected && "ring-2 ring-lake-600 shadow-xl shadow-lake-600/10",
          !job.isOpen && "opacity-80"
        )}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold leading-tight">{job.title}</h3>
                {!job.isOpen && <Badge variant="muted">Closed</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{job.employer}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveJob(job.id);
              }}
              aria-label={saved ? "Unsave job" : "Save job"}
            >
              <Bookmark
                className={cn("h-4 w-4", saved && "fill-accent-500 text-accent-500")}
              />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="accent">{formatPay(job)}</Badge>
            <Badge variant="muted">{job.employmentType}</Badge>
            {job.transitAccessible ? (
              <Badge variant="success">
                <Bus className="mr-1 h-3 w-3" aria-hidden />
                Transit accessible
              </Badge>
            ) : (
              <Badge variant="warning">Limited transit</Badge>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {job.location.city}, {job.location.county} County
            </span>
          </div>

          {job.commute && (
            <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Clock className="h-3.5 w-3.5 text-lake-600" aria-hidden />
                  {formatDuration(job.commute.durationMinutes)} by transit
                </span>
                {job.commuteFitScore !== undefined && (
                  <CommuteFitScore score={job.commuteFitScore} />
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.commute.transfers} transfer{job.commute.transfers !== 1 ? "s" : ""} ·{" "}
                {job.commute.walkMinutes} min walk
                {!job.commute.scheduleCompatible && " · Schedule gap"}
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="rounded-md bg-lake-50 px-2 py-0.5 text-xs text-lake-700 dark:bg-lake-900/30 dark:text-lake-100"
              >
                {skill}
              </span>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {job.isOpen && job.applicationUrl && (
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-lake-600 px-3 py-2 text-sm font-medium text-white hover:bg-lake-700"
                onClick={(e) => e.stopPropagation()}
              >
                View job <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Link
              href={`/transit?dest=${encodeURIComponent(job.location.address)}&job=${job.id}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <Navigation className="h-3 w-3" />
              Plan trip
            </Link>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function CommuteFitScore({ score }: { score: number }) {
  const variant =
    score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
  return (
    <Badge variant={variant} aria-label={`Commute fit score ${score} out of 100`}>
      Fit {score}
    </Badge>
  );
}

export function JobFilters({
  filters,
  onChange,
}: {
  filters: Record<string, string | boolean | number | undefined>;
  onChange: (key: string, value: string | boolean | number | undefined) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Keyword
        </label>
        <input
          type="text"
          value={(filters.keyword as string) ?? ""}
          onChange={(e) => onChange("keyword", e.target.value || undefined)}
          placeholder="Role, skill, employer…"
          className="mt-1.5 flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Industry
        </label>
        <select
          value={(filters.industry as string) ?? ""}
          onChange={(e) => onChange("industry", e.target.value || undefined)}
          className="mt-1.5 flex h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="">All industries</option>
          {["Healthcare", "Manufacturing", "Technology", "Logistics", "Retail", "Financial Services", "Hospitality"].map(
            (i) => (
              <option key={i} value={i}>
                {i}
              </option>
            )
          )}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Max commute (min)
        </label>
        <input
          type="range"
          min={15}
          max={90}
          step={5}
          value={(filters.maxCommute as number) ?? 45}
          onChange={(e) => onChange("maxCommute", Number(e.target.value))}
          className="mt-2 w-full"
        />
        <span className="text-sm font-medium">{(filters.maxCommute as number) ?? 45} min</span>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!filters.transitOnly}
          onChange={(e) => onChange("transitOnly", e.target.checked || undefined)}
          className="rounded border-border"
        />
        Transit accessible only
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!filters.rankByReach}
          onChange={(e) => onChange("rankByReach", e.target.checked || undefined)}
          className="rounded border-border"
        />
        Rank by best reach (pay + commute)
      </label>
    </div>
  );
}
