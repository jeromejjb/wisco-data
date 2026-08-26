"use client";

import { MapPin, Moon, Sun } from "lucide-react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { useAppStore } from "@/lib/store";

/** Minimal brand mark — only chrome on the home map screen. */
export function WorkspaceLogo() {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-40">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/95 px-3.5 py-2.5 shadow-[0_4px_24px_rgba(12,18,34,0.08)] backdrop-blur-md dark:border-white/10 dark:bg-[#0f1524]/95 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e6b9c] to-[#267a55] shadow-sm">
          <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-[#0c1222] dark:text-[#eef2f7]">
            Workways
          </p>
          <p className="text-[11px] font-medium text-[#5a6278] dark:text-[#8b95a8]">
            Wisconsin · {APP_VERSION_LABEL}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#5a6278] hover:bg-black/[0.04] dark:text-[#8b95a8] dark:hover:bg-white/10"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
