"use client";

import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import type { LeaderboardResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Today's office goal — target comes from manager settings (synced
 * server-side so every device sees the same number). Progress is the
 * sum of policies bound across the daily leaderboard. */

export function TVOfficeGoal({
  leaderboard,
}: {
  leaderboard: LeaderboardResponse;
}) {
  const { settings } = useManagerSettings();
  const bound = leaderboard.entries.reduce((sum, e) => sum + e.policies, 0);
  const target = settings.dailyPolicyGoal;
  const pct = Math.min(100, Math.round((bound / target) * 100));
  const hit = bound >= target;

  return (
    <div className="flex items-center gap-4 border-t border-border/60 px-6 py-2 sm:px-8 lg:px-12">
      <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Today&apos;s office goal
        <span className="ml-2 text-foreground">{target} policies</span>
      </p>

      <div className="relative flex-1">
        <div className="h-3 overflow-hidden rounded-full border border-border bg-muted/40">
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

      <p className="shrink-0 font-mono text-xl font-bold tabular-nums">
        {bound}
        <span className="ml-1.5 text-sm font-medium text-muted-foreground">
          / {target}
        </span>
      </p>
      <p
        className={cn(
          "w-20 shrink-0 text-right text-sm font-medium",
          hit ? "text-emerald-500" : "text-muted-foreground",
        )}
      >
        {hit ? "Goal hit 🎉" : `${pct}%`}
      </p>
    </div>
  );
}
