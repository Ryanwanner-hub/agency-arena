"use client";

import {
  Check,
  Flame,
  Snowflake,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Avatar } from "@/components/avatar/Avatar";
import { displayName, type AgentProfile, type LeaderboardEntry } from "@/lib/api";
import {
  computeStatus,
  computeStreak,
  STATUS_META,
  statusToAvatarStatus,
  type AgentStatus,
} from "@/lib/status";
import { cn } from "@/lib/utils";

import { MomentumIndicator } from "./MomentumIndicator";
import { MomentumMeter } from "./MomentumMeter";

const STATUS_ICON: Record<AgentStatus, typeof Flame> = {
  on_fire: Flame,
  heating_up: TrendingUp,
  steady: Check,
  needs_spark: Snowflake,
  slipping: TrendingDown,
};

const RANK_TILE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md shadow-amber-500/40 ring-1 ring-amber-300/60",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md shadow-slate-400/40 ring-1 ring-slate-300/60",
  3: "bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md shadow-orange-500/40 ring-1 ring-orange-300/60",
};

/* Alpha-based tints so podium rows read correctly on dark themes too. */
const PODIUM_ROW: Record<number, string> = {
  1: "bg-gradient-to-r from-amber-400/10 via-amber-400/[0.04] to-transparent",
  2: "bg-gradient-to-r from-slate-400/10 via-slate-400/[0.04] to-transparent",
  3: "bg-gradient-to-r from-orange-400/10 via-orange-400/[0.04] to-transparent",
};

export function LeaderboardRow({
  entry,
  profile,
  selected,
  onClick,
  rankDelta,
  showCloseRate = true,
}: {
  entry: LeaderboardEntry;
  profile?: AgentProfile;
  selected: boolean;
  onClick: () => void;
  /** Positive = moved up (e.g. was 3, now 1 → +2). Undefined = no movement
   * data (first poll or unchanged). */
  rankDelta?: number;
  /** Hide the close-rate column to keep the header/body in sync. */
  showCloseRate?: boolean;
}) {
  const streak = profile ? computeStreak(profile.daily_history) : 0;
  const status = computeStatus({
    rank: entry.rank,
    pointsToday: entry.total_points,
    streak,
    trendPct: entry.trend_pct,
    trendDelta: entry.trend_delta,
  });
  const meta = STATUS_META[status];
  const StatusIcon = STATUS_ICON[status];
  const isTop3 = entry.rank <= 3;

  return (
    <tr
      onClick={onClick}
      className={cn(
        "leaderboard-row cursor-pointer border-t transition-colors",
        isTop3 && "top-3-row",
        isTop3 && PODIUM_ROW[entry.rank],
        selected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
        !selected && "hover:bg-muted/40",
      )}
    >
      <td className={cn("px-4", isTop3 ? "py-4" : "py-3")}>
        <div className="relative inline-block">
          <span
            className={cn(
              `rank-tile rank-${entry.rank}`,
              "stat-number inline-flex items-center justify-center rounded-full font-bold",
              isTop3 ? "h-8 w-8 text-sm" : "h-7 w-7 text-xs",
              RANK_TILE[entry.rank] ??
                "border bg-background text-muted-foreground",
            )}
          >
            {entry.rank}
          </span>
          {rankDelta !== undefined && rankDelta !== 0 && (
            <span
              className={cn(
                "absolute -bottom-1.5 -right-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ring-1 ring-card",
                rankDelta > 0
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white",
              )}
              title={`Moved ${rankDelta > 0 ? "up" : "down"} ${Math.abs(rankDelta)} since last poll`}
            >
              {rankDelta > 0 ? "↑" : "↓"}
              {Math.abs(rankDelta)}
            </span>
          )}
        </div>
      </td>
      <td className={cn("px-4", isTop3 ? "py-4" : "py-3")}>
        <div className="flex items-center gap-3">
          <Avatar
            name={displayName(entry)}
            avatarUrl={entry.avatar_url}
            avatarPreset={entry.avatar_preset}
            size={isTop3 ? "md" : "sm"}
            rank={entry.rank}
            status={statusToAvatarStatus(status)}
          />
          <div className="min-w-0">
            <div className="font-medium text-foreground">
              {displayName(entry)}
            </div>
            <div className="text-xs text-muted-foreground">
              {entry.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </td>
      <td className={cn("px-4 text-right", isTop3 ? "py-4" : "py-3")}>
        <div className="flex flex-col items-end leading-tight">
          <span
            className={cn(
              "points-value stat-number font-bold",
              isTop3 ? "text-2xl" : "text-lg",
              entry.rank === 1 && "text-gradient-primary",
            )}
          >
            {entry.total_points}
          </span>
          <MomentumIndicator delta={entry.trend_delta} pct={entry.trend_pct} />
        </div>
      </td>
      <td className={cn("px-4 text-right font-mono tabular-nums", isTop3 ? "py-4 text-base" : "py-3")}>
        {entry.quotes}
      </td>
      <td className={cn("px-4 text-right font-mono tabular-nums", isTop3 ? "py-4 text-base" : "py-3")}>
        {entry.policies}
      </td>
      {showCloseRate && (
        <td className={cn("px-4 text-right font-mono tabular-nums", isTop3 ? "py-4" : "py-3")}>
          {entry.quotes > 0 ? `${Math.round(entry.close_rate * 100)}%` : "—"}
        </td>
      )}
      <td className={cn("px-4 text-right", isTop3 ? "py-4" : "py-3")}>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-mono",
            streak >= 5
              ? "text-orange-600 font-semibold"
              : streak >= 3
                ? "text-amber-600"
                : "text-muted-foreground",
          )}
        >
          {streak >= 5 && <span aria-hidden>🔥</span>}
          {streak}d
        </span>
      </td>
      <td className={cn("px-4", isTop3 ? "py-4" : "py-3")}>
        <div className="flex items-center gap-2">
          <MomentumMeter status={status} />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              meta.pillClassName,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {meta.label}
          </span>
        </div>
      </td>
    </tr>
  );
}
