"use client";

import { BarChart3, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { api, displayName, type SummaryReport } from "@/lib/api";
import { localDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

type RangePreset =
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_7"
  | "last_30"
  | "custom";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "custom", label: "Custom" },
];

function dateMinus(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return out;
}

function presetRange(preset: RangePreset): { start: string; end: string } {
  const today = new Date();
  const todayKey = localDateKey(today);
  if (preset === "this_week") {
    const dow = (today.getDay() + 6) % 7; // Mon=0..Sun=6
    return {
      start: localDateKey(dateMinus(today, dow)),
      end: todayKey,
    };
  }
  if (preset === "last_week") {
    const dow = (today.getDay() + 6) % 7;
    const lastMon = dateMinus(today, dow + 7);
    const lastSun = dateMinus(today, dow + 1);
    return { start: localDateKey(lastMon), end: localDateKey(lastSun) };
  }
  if (preset === "this_month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: localDateKey(first), end: todayKey };
  }
  if (preset === "last_month") {
    const firstThis = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastPrev = dateMinus(firstThis, 1);
    const firstPrev = new Date(
      lastPrev.getFullYear(),
      lastPrev.getMonth(),
      1,
    );
    return { start: localDateKey(firstPrev), end: localDateKey(lastPrev) };
  }
  if (preset === "last_7") {
    return { start: localDateKey(dateMinus(today, 6)), end: todayKey };
  }
  if (preset === "last_30") {
    return { start: localDateKey(dateMinus(today, 29)), end: todayKey };
  }
  // custom — caller picks
  return { start: todayKey, end: todayKey };
}

function fmtDollar(v: number): string {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(report: SummaryReport) {
  const headers = [
    "Agent",
    "Role",
    "Policies",
    "Bundles",
    "Referrals",
    "Reviews",
    "Premium ($)",
    "Points",
    "Close rate",
  ];
  const rows = [
    ...report.agents.map((a) => [
      displayName(a),
      a.role.replace(/_/g, " "),
      a.policies,
      a.bundles,
      a.referrals,
      a.reviews,
      Math.round(a.premium_total),
      a.total_points,
      a.close_rate > 0 ? `${Math.round(a.close_rate * 100)}%` : "—",
    ]),
    [
      "Team total",
      "",
      report.team.policies,
      report.team.bundles,
      report.team.referrals,
      report.team.reviews,
      Math.round(report.team.premium_total),
      report.team.total_points,
      report.team.close_rate > 0
        ? `${Math.round(report.team.close_rate * 100)}%`
        : "—",
    ],
  ];
  const csv =
    [headers, ...rows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n") + "\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agency-arena-${report.start_date}_to_${report.end_date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient() {
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [range, setRange] = useState(presetRange("this_month"));
  const [data, setData] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset === "custom") return;
    setRange(presetRange(preset));
  }, [preset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<SummaryReport>(
      `/reports/summary?start=${range.start}&end=${range.end}`,
    )
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);

  const activityRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.activity_by_type)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Pull metrics for any window — pick a preset or set custom dates."
        actions={
          data ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadCsv(data)}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  preset === p.value
                    ? "bg-gradient-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Start
              </label>
              <input
                type="date"
                value={range.start}
                onChange={(e) => {
                  setPreset("custom");
                  setRange({ ...range, start: e.target.value });
                }}
                max={range.end}
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                End
              </label>
              <input
                type="date"
                value={range.end}
                onChange={(e) => {
                  setPreset("custom");
                  setRange({ ...range, end: e.target.value });
                }}
                min={range.start}
                className="rounded-md border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {fmtDate(range.start)} → {fmtDate(range.end)}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Per-agent breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Agent</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Policies
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Bundles
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Referrals
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Reviews
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Premium
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Points
                  </th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Close rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.agents.map((a) => (
                    <tr key={a.agent_id} className="border-t">
                      <td className="px-5 py-3">
                        <div className="font-medium">{displayName(a)}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.role.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {a.policies}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {a.bundles}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {a.referrals}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {a.reviews}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {fmtDollar(a.premium_total)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums">
                        {a.total_points}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {a.close_rate > 0
                          ? `${Math.round(a.close_rate * 100)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                {!loading && data && data.agents.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-muted-foreground"
                    >
                      No active agents in this window.
                    </td>
                  </tr>
                )}
              </tbody>
              {!loading && data && (
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td className="px-5 py-3">Team total</td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.policies}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.bundles}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.referrals}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.reviews}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {fmtDollar(data.team.premium_total)}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.total_points}
                    </td>
                    <td className="stat-number px-5 py-3 text-right font-bold">
                      {data.team.close_rate > 0
                        ? `${Math.round(data.team.close_rate * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {!loading && data && activityRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {activityRows.map(([type, count]) => (
                <li
                  key={type}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-muted-foreground">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
