"use client";

import { Calendar, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, type ContestListItem, type ContestStandings } from "@/lib/api";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

const METRIC_LABEL: Record<string, string> = {
  quotes: "Most quotes",
  policies: "Most policies",
  referrals: "Most referrals",
  bundles: "Most bundles",
  reviews: "Most 5-star reviews",
  points: "Most points",
  improved: "Most improved",
};

const RANK_TILE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-white",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  3: "bg-gradient-to-br from-orange-300 to-orange-500 text-white",
};

function formatDate(iso: string): string {
  return formatDateOnly(iso, {
    month: "short",
    day: "numeric",
  });
}

function formatValue(value: number, metric: string): string {
  if (metric === "improved") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)} pts`;
  }
  if (metric === "points") return `${Math.round(value)} pts`;
  return String(Math.round(value));
}

/** Picks the most relevant active contest (or the most recently ended if
 * none active) and renders its top 3 standings inline. */
export function ActiveContestCard({
  contests,
}: {
  contests: ContestListItem[];
}) {
  const [standings, setStandings] = useState<ContestStandings | null>(null);

  // Prefer active over ended; among active, prefer daily over weekly so the
  // card reflects "right now". Falls through to the most recent ended if
  // there's nothing active.
  const featured = pickFeatured(contests);

  useEffect(() => {
    if (!featured) {
      setStandings(null);
      return;
    }
    let cancelled = false;
    api<ContestStandings>(`/contests/${featured.id}/standings`)
      .then((s) => {
        if (!cancelled) setStandings(s);
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, [featured?.id]);

  if (!featured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Active contest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center">
            <Trophy className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm font-medium">No contests running</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Spin one up from the Contests page.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const top3 = standings?.entries.slice(0, 3) ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            {featured.status === "active" ? "Active contest" : "Latest contest"}
          </CardTitle>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              featured.status === "active"
                ? "bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/25"
                : "bg-muted text-muted-foreground ring-1 ring-border",
            )}
          >
            {featured.status}
          </span>
        </div>
        <CardDescription>
          {METRIC_LABEL[featured.metric] ?? featured.metric} · {featured.type}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-medium leading-tight">{featured.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(featured.start_date)} → {formatDate(featured.end_date)}
        </p>

        {top3.length > 0 && (
          <ol className="space-y-1.5 border-t pt-3">
            {top3.map((entry) => (
              <li
                key={entry.agent_id}
                className="flex items-center gap-2 text-sm"
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold",
                    RANK_TILE[entry.rank] ??
                      "border bg-muted text-muted-foreground",
                  )}
                >
                  {entry.rank}
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                <span className="stat-number text-sm font-bold">
                  {formatValue(entry.value, featured.metric)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function pickFeatured(contests: ContestListItem[]): ContestListItem | null {
  const active = contests.filter((c) => c.status === "active");
  if (active.length > 0) {
    // daily wins over weekly when both are active.
    const daily = active.find((c) => c.type === "daily");
    return daily ?? active[0];
  }
  const ended = contests.filter((c) => c.status === "ended");
  if (ended.length === 0) return null;
  return [...ended].sort((a, b) =>
    b.end_date.localeCompare(a.end_date),
  )[0];
}
