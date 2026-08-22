"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import type { JobsMeta } from "@/lib/jobs-errors";
import { JobsSetupBanner } from "@/components/jobs/jobs-setup-banner";

type JobsStatusBannerProps = {
  meta?: JobsMeta;
  className?: string;
};

export function JobsStatusBanner({ meta, className }: JobsStatusBannerProps) {
  if (!meta) return null;

  if (meta.keysRequired || meta.status === "unconfigured") {
    return <JobsSetupBanner className={className} />;
  }

  const activeErrors = meta.errors.filter((e) => e.code !== "not_configured");
  if (meta.status === "failed" && meta.userMessage) {
    return (
      <StatusAlert
        variant="error"
        title="Could not load live jobs"
        message={meta.userMessage}
        className={className}
      />
    );
  }

  if (meta.status === "partial" && activeErrors.length > 0) {
    return (
      <StatusAlert
        variant="warning"
        title="Some job sources unavailable"
        message={meta.userMessage ?? activeErrors.map((e) => e.userMessage).join(" ")}
        className={className}
      />
    );
  }

  if (meta.status === "empty" && meta.liveCount === 0 && activeErrors.length === 0) {
    return null;
  }

  return null;
}

function StatusAlert({
  variant,
  title,
  message,
  className,
}: {
  variant: "error" | "warning" | "info";
  title: string;
  message: string;
  className?: string;
}) {
  const styles = {
    error:
      "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100",
    info: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-100",
  }[variant];

  const Icon = variant === "error" ? AlertCircle : variant === "warning" ? AlertTriangle : Info;

  return (
    <div
      className={
        className ??
        `mt-3 flex gap-2 rounded-xl border p-3 text-xs leading-relaxed ${styles}`
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 opacity-90">{message}</p>
      </div>
    </div>
  );
}
