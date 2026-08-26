"use client";

import { MapPin, Moon, Sun } from "lucide-react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { useAppStore } from "@/lib/store";

/** Minimal brand mark — only chrome on the home map screen. */
export function WorkspaceLogo() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="pointer-events-none fixed left-3 top-3 z-40 sm:left-4 sm:top-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 py-1.5 pl-1.5 pr-1.5 shadow-[0_8px_28px_rgba(12,18,34,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-[#0f1524]/90 dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)] sm:gap-2.5 sm:pr-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1e6b9c] to-[#267a55]">
          <MapPin className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 leading-tight pr-1">
          <p className="font-display text-[13px] font-semibold tracking-tight text-[#0c1222] dark:text-[#eef2f7]">
            Workways
          </p>
          <p className="text-[10px] font-medium text-[#5a6278] dark:text-[#b4bcc9]">
            Wisconsin · {APP_VERSION_LABEL}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#5a6278] hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-[#eef2f7] dark:hover:bg-white/10"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
