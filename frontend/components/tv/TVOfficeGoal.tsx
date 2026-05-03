"use client";

import type { LeaderboardResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Today's office goal — for the demo this is "10 policies bound today".
 * Computes progress from the daily leaderboard's policies sum. */
const TARGET_POLICIES = 10;

export function TVOfficeGoal({
  leaderboard,
}: {
  leaderboard: LeaderboardResponse;
}) {
  const bound = leaderboard.entries.reduce((sum, e) => sum + e.policies, 0);
  const target = TARGET_POLICIES;
  const pct = Math.min(100, Math.round((bound / target) * 100));
  const hit = bound >= target;

  return (
    <div className="flex items-center gap-6 border-t border-border/60 px-6 py-4 sm:px-8 lg:px-12">
      <div className="shrink-0">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Today's office goal
        </p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight">
          {target} policies bound
        </p>
      </div>

      <div className="relative flex-1">
        <div className="h-6 overflow-hidden rounded-full border border-border bg-muted/40">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out",
              hit
                ? "from-emerald-400 to-emerald-500"
                : "from-primary/70 to-primary",
            )}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-3xl font-bold tabular-nums">
          {bound}
          <span className="ml-2 text-base font-medium text-muted-foreground">
            / {target}
          </span>
        </p>
        <p
          className={cn(
            "text-sm font-medium",
            hit ? "text-emerald-500" : "text-muted-foreground",
          )}
        >
          {hit ? "Goal hit 🎉" : `${pct}% — keep going`}
        </p>
      </div>
    </div>
  );
}
