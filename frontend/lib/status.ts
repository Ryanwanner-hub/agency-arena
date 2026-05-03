import type { AvatarStatus } from "@/components/avatar/Avatar";

import type { DailyHistoryPoint } from "./api";
import { localDateKeyNDaysAgo } from "./dates";

export type AgentStatus =
  | "on_fire"
  | "heating_up"
  | "steady"
  | "needs_spark"
  | "slipping";

/** Consecutive UTC days (counting back from today) where the agent had any
 * activity (i.e. ``total_points > 0``). Stops at the first quiet day. */
export function computeStreak(history: DailyHistoryPoint[]): number {
  const byDate = new Map(history.map((h) => [h.date, h.total_points]));
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    if ((byDate.get(localDateKeyNDaysAgo(i)) ?? 0) > 0) streak++;
    else break;
  }
  return streak;
}

export type StatusInputs = {
  /** 1-indexed rank in today's leaderboard. */
  rank: number;
  /** Total points scored today. */
  pointsToday: number;
  /** Consecutive active days, counting back from today. */
  streak: number;
  /** Percent change vs prior equal-length window. ``null`` when prior was 0. */
  trendPct: number | null;
  /** Signed delta in points vs prior window. */
  trendDelta: number;
};

/** Decision tree that maps live performance to a momentum status. Order
 * matters — earlier rules win on overlap.
 *
 *   On Fire     — rank #1 today, OR top-3 with positive trend, OR week-long
 *                 streak that's still scoring.
 *   Slipping    — meaningfully down vs prior period.
 *   Heating Up  — improving vs prior period (or "new" with no prior data).
 *   Needs Spark — quiet today (no points logged).
 *   Steady      — default for everyone consistent and unremarkable.
 */
export function computeStatus({
  rank,
  pointsToday,
  streak,
  trendPct,
  trendDelta,
}: StatusInputs): AgentStatus {
  // ── On Fire ──
  if (pointsToday > 0 && rank === 1) return "on_fire";
  if (
    pointsToday > 0 &&
    rank <= 3 &&
    ((trendPct ?? 0) > 0 || (trendPct === null && trendDelta > 0))
  ) {
    return "on_fire";
  }
  if (pointsToday > 0 && streak >= 7) return "on_fire";

  // ── Slipping (down >25% vs prior) ──
  if (trendPct !== null && trendPct <= -25) return "slipping";

  // ── Needs Spark (no activity today) ──
  if (pointsToday === 0) return "needs_spark";

  // ── Heating Up (positive trend) ──
  if (trendPct !== null && trendPct >= 10) return "heating_up";
  if (trendPct === null && trendDelta > 0) return "heating_up";

  // ── Steady (default) ──
  return "steady";
}

export type StatusMeta = {
  label: string;
  /** 1 (cool) → 5 (hot) — drives the meter fill. */
  intensity: 1 | 2 | 3 | 4 | 5;
  /** Pill bg + ring + text classes. */
  pillClassName: string;
  /** Tailwind class for the meter's filled bars. */
  meterColor: string;
};

export const STATUS_META: Record<AgentStatus, StatusMeta> = {
  on_fire: {
    label: "On Fire",
    intensity: 5,
    pillClassName: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
    meterColor: "bg-orange-500",
  },
  heating_up: {
    label: "Heating Up",
    intensity: 4,
    pillClassName: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    meterColor: "bg-amber-500",
  },
  steady: {
    label: "Steady",
    intensity: 3,
    pillClassName: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
    meterColor: "bg-blue-500",
  },
  needs_spark: {
    label: "Needs Spark",
    intensity: 2,
    pillClassName: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    meterColor: "bg-slate-400",
  },
  slipping: {
    label: "Slipping",
    intensity: 1,
    pillClassName: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
    meterColor: "bg-rose-500",
  },
};

/** Translate a momentum status to the closest avatar status effect.
 * Returns ``null`` for ``steady`` (no avatar overlay).
 *
 * Two of the five momentum statuses (``heating_up``, ``slipping``) have
 * no exact avatar match — they map to the visually-closest existing
 * effect (``hot_streak`` and ``needs_spark`` respectively). */
export function statusToAvatarStatus(s: AgentStatus): AvatarStatus | null {
  switch (s) {
    case "on_fire":
      return "on_fire";
    case "heating_up":
      return "hot_streak";
    case "steady":
      return null;
    case "needs_spark":
      return "needs_spark";
    case "slipping":
      return "needs_spark";
  }
}
