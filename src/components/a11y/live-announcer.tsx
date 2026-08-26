"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Politeness = "polite" | "assertive";

type AnnounceFn = (message: string, politeness?: Politeness) => void;

const LiveAnnouncerContext = createContext<AnnounceFn>(() => {});

/** Screen-reader-only live regions so status changes are spoken (audio a11y). */
export function LiveAnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const politeClear = useRef<number>(0);
  const assertiveClear = useRef<number>(0);

  const announce = useCallback<AnnounceFn>((message, politeness = "polite") => {
    const text = message.replace(/\s+/g, " ").trim();
    if (!text) return;
    const set = politeness === "assertive" ? setAssertive : setPolite;
    const timer = politeness === "assertive" ? assertiveClear : politeClear;
    set("");
    requestAnimationFrame(() => {
      set(text);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => set(""), 8000);
    });
  }, []);

  return (
    <LiveAnnouncerContext.Provider value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

export function useLiveAnnounce(): AnnounceFn {
  return useContext(LiveAnnouncerContext);
}
