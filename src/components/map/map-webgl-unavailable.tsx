"use client";

import { MonitorOff } from "lucide-react";
import { webGLUnavailableCopy, type WebGL2Probe } from "@/lib/webgl-support";

export function MapWebGLUnavailable({ probe }: { probe?: WebGL2Probe }) {
  const copy = webGLUnavailableCopy(probe);
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#eef2f6] px-6 py-8 text-center dark:bg-navy-900"
      role="alert"
    >
      <MonitorOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{copy.title}</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
      <ol className="max-w-md list-decimal space-y-1 pl-5 text-left text-xs leading-relaxed text-muted-foreground">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
