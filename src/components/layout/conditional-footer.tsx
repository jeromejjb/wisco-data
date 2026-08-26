"use client";

import { RouteFooter } from "./site-footer";
import { usePathname } from "next/navigation";

/** Full-bleed map home uses in-page chrome; the global footer would overlap the ask dock. */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <RouteFooter />;
}
