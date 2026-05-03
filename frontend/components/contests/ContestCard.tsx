"use client";

import { Calendar, RefreshCw, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ContestListItem, ContestStatus } from "@/lib/api";

const STATUS_PILL: Record<ContestStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  ended: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const METRIC_LABEL: Record<string, string> = {
  quotes: "Most quotes",
  policies: "Most policies",
  referrals: "Most referrals",
  points: "Most points",
  improved: "Most improved",
};

const STATUS_LABEL: Record<ContestStatus, string> = {
  active: "Active",
  pending: "Upcoming",
  ended: "Ended",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLeaderValue(value: number, metric: string): string {
  if (metric === "improved") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)} pts`;
  }
  if (metric === "points") return `${Math.round(value)} pts`;
  return String(Math.round(value));
}

export function ContestCard({
  contest,
  selected,
  onClick,
}: {
  contest: ContestListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {contest.type} · {METRIC_LABEL[contest.metric] ?? contest.metric}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold">
              {contest.name}
            </h3>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              STATUS_PILL[contest.status],
            )}
          >
            {STATUS_LABEL[contest.status]}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {formatDate(contest.start_date)} → {formatDate(contest.end_date)}
          </span>
          {contest.auto_renew && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
              <RefreshCw className="h-3 w-3" />
              auto
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t pt-3">
          {contest.leader_name ? (
            <>
              <Trophy className="h-4 w-4 text-amber-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {contest.leader_name}
                </p>
                <p className="text-[11px] text-muted-foreground">Leading</p>
              </div>
              <p className="font-mono text-sm font-semibold">
                {formatLeaderValue(contest.leader_value ?? 0, contest.metric)}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {contest.status === "pending"
                ? "Starts soon"
                : "No standings yet"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
