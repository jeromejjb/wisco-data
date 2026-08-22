import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <h1 className="font-display text-2xl font-bold">Admin</h1>
      <p className="mt-1 text-muted-foreground">Internal tools for Wisconsin Workways.</p>

      <div className="mt-8 grid gap-4">
        <Link href="/admin/experiments">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Prompt experiments</CardTitle>
                <p className="text-sm font-normal text-muted-foreground">
                  A/B stats for localized map chat starters
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
