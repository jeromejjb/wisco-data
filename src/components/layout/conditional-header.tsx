"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";

/** Full-bleed map home uses in-page chrome instead of the global header. */
export function ConditionalHeader() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Header />;
}
