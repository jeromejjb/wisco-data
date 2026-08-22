"use client";

import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

type JobsSetupBannerProps = {
  className?: string;
};

export function JobsSetupBanner({ className }: JobsSetupBannerProps) {
  return (
    <div
      className={
        className ??
        "mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100"
      }
    >
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Enable live job listings</p>
          <p className="mt-1 leading-relaxed opacity-90">
            Add API keys to <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">.env</code>{" "}
            and restart the dev server. At least one source is enough.
          </p>
        </div>
      </div>
      <div className="ml-6 space-y-2 font-mono text-[11px] leading-relaxed">
        <p>
          <span className="text-amber-800/70 dark:text-amber-200/70"># USAJobs (federal)</span>
          <br />
          USAJOBS_AUTH_KEY=
          <br />
          USAJOBS_USER_AGENT=your@email.com
        </p>
        <p>
          <span className="text-amber-800/70 dark:text-amber-200/70"># Adzuna (aggregated)</span>
          <br />
          ADZUNA_APP_ID=
          <br />
          ADZUNA_APP_KEY=
        </p>
      </div>
      <div className="ml-6 flex flex-wrap gap-3 text-[11px] font-medium">
        <Link
          href="https://developer.usajobs.gov/apirequest/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-lake-700 hover:underline dark:text-lake-300"
        >
          Get USAJobs key <ExternalLink className="h-3 w-3" />
        </Link>
        <Link
          href="https://developer.adzuna.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-lake-700 hover:underline dark:text-lake-300"
        >
          Get Adzuna keys <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
