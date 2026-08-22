"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
} from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  trend,
  live,
}: {
  label: string;
  value: string;
  subtext?: string;
  trend?: { value: number; positive: boolean };
  live?: boolean;
}) {
  return (
    <div className="stat-glow glass-panel rounded-2xl p-5 transition-all hover:shadow-lg">
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {live && (
          <span className="flex h-2 w-2 rounded-full bg-forest-600 live-dot" aria-label="Live data" />
        )}
      </div>
      <p className="relative mt-3 font-display text-3xl font-bold tabular-nums tracking-tight lg:text-4xl">
        {value}
      </p>
      {subtext && (
        <p className="relative mt-1.5 text-sm text-muted-foreground">{subtext}</p>
      )}
      {trend && (
        <p
          className={`relative mt-2 text-xs font-semibold ${
            trend.positive ? "text-forest-600" : "text-danger"
          }`}
        >
          {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs last year
        </p>
      )}
    </div>
  );
}

export function UnemploymentChart({
  data,
}: {
  data: { month: string; wi: number; us: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => `${v}%`} />
        <Line type="monotone" dataKey="wi" name="Wisconsin" stroke="#2d6a9f" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="us" name="U.S." stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IndustryTreemap({
  data,
}: {
  data: { name: string; value: number; growth: number }[];
}) {
  const colored = data.map((d, i) => ({
    ...d,
    fill: ["#2d6a9f", "#2d6a4e", "#c4703f", "#1a2744", "#5ba3d4", "#245a42", "#a85a2e", "#64748b"][i % 8],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap
        data={colored}
        dataKey="value"
        nameKey="name"
        stroke="#fff"
        content={({ x, y, width, height, name, value }) => (
          <g>
            {width > 40 && height > 30 && (
              <>
                <text x={x + 8} y={y + 20} fill="#fff" fontSize={12} fontWeight={600}>
                  {name}
                </text>
                <text x={x + 8} y={y + 36} fill="#ffffffcc" fontSize={11}>
                  {value}%
                </text>
              </>
            )}
          </g>
        )}
      />
    </ResponsiveContainer>
  );
}

export function BudgetBarChart({
  data,
}: {
  data: { year: string; transit: number; workforce: number; infrastructure: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}M`} />
        <Tooltip formatter={(v) => `$${v}M`} />
        <Bar dataKey="transit" name="Transit" fill="#2d6a9f" radius={[4, 4, 0, 0]} />
        <Bar dataKey="workforce" name="Workforce" fill="#2d6a4e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="infrastructure" name="Infrastructure" fill="#c4703f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OpportunityIndex({ score }: { score: number }) {
  const color =
    score >= 75 ? "text-forest-600" : score >= 55 ? "text-lake-600" : "text-accent-600";
  return (
    <div className="flex items-center gap-4">
      <div className={`text-5xl font-bold tabular-nums ${color}`}>{score}</div>
      <div>
        <p className="font-semibold">Opportunity Index</p>
        <p className="text-sm text-muted-foreground">
          Jobs, wages, transit access, affordability & growth
        </p>
      </div>
    </div>
  );
}

export function CountyCompareRow({
  left,
  right,
  metric,
  format = (v: number) => String(v),
}: {
  left: { name: string; value: number };
  right: { name: string; value: number };
  metric: string;
  format?: (v: number) => string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border py-3 last:border-0">
      <div className="text-right">
        <p className="text-xs text-muted-foreground">{left.name}</p>
        <p className="text-lg font-semibold tabular-nums">{format(left.value)}</p>
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {metric}
      </p>
      <div>
        <p className="text-xs text-muted-foreground">{right.name}</p>
        <p className="text-lg font-semibold tabular-nums">{format(right.value)}</p>
      </div>
    </div>
  );
}

export { formatCurrency, formatPercent };
