"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { spatialSpring } from "@/lib/motion";

/** Honor OS reduced-motion and apply Material-standard spatial springs app-wide. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={spatialSpring}>
      {children}
    </MotionConfig>
  );
}
