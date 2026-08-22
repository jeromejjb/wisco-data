"use client";

import { useState } from "react";
import { MapPin, TrendingUp, Info } from "lucide-react";
import { BudgetBarChart } from "@/components/charts/economy-charts";
import { WorkwaysMap } from "@/components/map/workways-map";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshness } from "@/components/ui/states";
import { budgetsAdapter } from "@/services/adapters";
import { formatCurrency } from "@/lib/utils";

export default function BudgetsPage() {
  const entities = budgetsAdapter.getEntities();
  const [selectedId, setSelectedId] = useState(entities[0]?.id);

  const selected = budgetsAdapter.getEntity(selectedId ?? "");

  const projectMarkers = entities.flatMap((e) =>
    e.capitalProjects.map((p) => ({
      id: p.id,
      coordinates: p.coordinates,
      color: p.type === "transit" ? "#2d6a9f" : "#2d6a4e",
      selected: selected?.capitalProjects.some((cp) => cp.id === p.id),
    }))
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">Budgets & Investment</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          How public money and economic investment relate to jobs, transportation, and neighborhoods.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-1">
          {entities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => setSelectedId(entity.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedId === entity.id
                  ? "border-lake-600 bg-lake-50/50 ring-1 ring-lake-600 dark:bg-lake-900/20"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{entity.name}</p>
                  <p className="text-sm text-muted-foreground">{entity.geography}</p>
                </div>
                <Badge variant="muted">{entity.type}</Badge>
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums">
                {formatCurrency(entity.totalBudget, true)}
              </p>
              <p className="text-xs text-muted-foreground">{entity.fiscalYear}</p>
            </button>
          ))}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {selected && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selected.name}</CardTitle>
                  <CardDescription>
                    <DataFreshness
                      source={selected.provenance.source}
                      lastUpdated={selected.provenance.lastUpdated}
                    />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {selected.categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="rounded-xl border border-border bg-muted/30 p-4"
                      >
                        <p className="text-sm text-muted-foreground">{cat.name}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                          {formatCurrency(cat.amount, true)}
                        </p>
                        <p
                          className={`mt-1 text-xs font-medium ${
                            cat.changeYoY >= 0 ? "text-forest-600" : "text-danger"
                          }`}
                        >
                          {cat.changeYoY >= 0 ? "+" : ""}
                          {cat.changeYoY}% YoY · ${cat.perCapita}/capita
                        </p>
                      </div>
                    ))}
                  </div>

                  {selected.insight && (
                    <div className="mt-6 flex gap-3 rounded-xl bg-lake-50 p-4 dark:bg-lake-900/20">
                      <Info className="h-5 w-5 shrink-0 text-lake-600" />
                      <p className="text-sm">{selected.insight}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <WorkwaysMap
                center={selected.coordinates}
                zoom={10}
                markers={projectMarkers}
                className="h-[360px]"
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Capital projects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.capitalProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-xl border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <Badge variant="muted" className="mt-1 capitalize">
                          {project.status.replace("-", " ")}
                        </Badge>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(project.amount, true)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Investment trends (statewide, $M)
              </CardTitle>
              <CardDescription>
                Methodology: aggregated from open budget documents. Not all jurisdictions report uniformly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetBarChart data={budgetsAdapter.getTrend()} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
