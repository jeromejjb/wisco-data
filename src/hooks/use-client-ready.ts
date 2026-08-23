"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";

/**
 * True after the browser has mounted and persisted Zustand state has rehydrated.
 * Use before rendering anything that depends on sessionStorage, random IDs, or
 * localStorage-backed prefs so SSR and the first client paint stay identical.
 */
export function useClientReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const markReady = () => setReady(true);
    if (useAppStore.persist.hasHydrated()) {
      markReady();
      return;
    }
    return useAppStore.persist.onFinishHydration(markReady);
  }, []);

  return ready;
}
