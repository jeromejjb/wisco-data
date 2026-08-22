import type { Metadata } from "next";
import { Suspense } from "react";
import { ExperimentsDashboard } from "@/components/admin/experiments-dashboard";

export const metadata: Metadata = {
  title: "Admin · Prompt experiments",
  robots: { index: false, follow: false },
};

export default function AdminExperimentsPage() {
  return (
    <Suspense fallback={<p className="px-8 py-12 text-sm text-muted-foreground">Loading…</p>}>
      <ExperimentsDashboard />
    </Suspense>
  );
}
