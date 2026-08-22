import Link from "next/link";
import { ArrowRight, Download, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataFreshness } from "@/components/ui/states";
import { insightsAdapter } from "@/services/adapters";

export default function InsightsPage() {
  const insights = insightsAdapter.getAll();
  const featured = insights.find((i) => i.id === "insight-5");
  const rest = insights.filter((i) => i.id !== "insight-5");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold lg:text-3xl">Insights</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Data-driven stories about Wisconsin jobs, transit access, and community investment.
        </p>
      </div>

      {featured && (
        <Card className="mb-10 overflow-hidden border-lake-600/30 bg-gradient-to-br from-lake-50/50 to-transparent dark:from-lake-900/20">
          <CardHeader>
            <Badge variant="accent" className="w-fit">
              What changed this month?
            </Badge>
            <CardTitle className="text-xl lg:text-2xl">{featured.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{featured.summary}</p>
            <DataFreshness
              source={featured.provenance.source}
              lastUpdated={featured.provenance.lastUpdated}
            />
            <div className="mt-4 flex gap-3">
              <button className="inline-flex items-center gap-2 text-sm font-medium text-lake-600 hover:underline">
                <Download className="h-4 w-4" /> Download report card
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-medium text-lake-600 hover:underline">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {rest.map((insight) => (
          <Card key={insight.id} className="group transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{insight.category}</Badge>
                {insight.region && <Badge variant="muted">{insight.region}</Badge>}
              </div>
              <CardTitle className="group-hover:text-lake-600">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {insight.highlight && (
                <p className="mb-3 text-sm font-semibold text-forest-600">
                  {insight.highlight}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{insight.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {insight.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <DataFreshness
                source={insight.provenance.source}
                lastUpdated={insight.provenance.lastUpdated}
              />
              <Link
                href={`/explore`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-lake-600 hover:underline"
              >
                Explore data <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
