"use client";

import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import type { LeaderboardResponse } from "@/lib/api";
import { displayName } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Full-screen team-goal hero panel. Same data as the OfficeGoal strip
 * but presented for "look across the room" reading. Target comes from
 * the manager settings so it can be tuned without a redeploy. */
export function TeamGoalPanel({
  leaderboard,
}: {
  leaderboard: LeaderboardResponse;
}) {
  const { settings } = useManagerSettings();
  const bound = leaderboard.entries.reduce((sum, e) => sum + e.policies, 0);
  const target = settings.dailyPolicyGoal;
  const pct = Math.min(100, Math.round((bound / target) * 100));
  const hit = bound >= target;

  // Top contributor today — whoever bound the most policies.
  const top = [...leaderboard.entries]
    .filter((e) => e.policies > 0)
    .sort((a, b) => b.policies - a.policies)[0];

  return (
    <div className="flex w-full flex-col items-center justify-center gap-8 self-center">
      <p className="text-base font-semibold uppercase tracking-[0.4em] text-muted-foreground">
        {hit ? "Goal hit" : "Pushing for the goal"}
      </p>

      <p className="text-center text-7xl font-semibold leading-none tracking-tight">
        {bound}{" "}
        <span className="text-muted-foreground">/</span> {target}
      </p>
      <p className="-mt-3 text-2xl text-muted-foreground">
        Policies bound today
      </p>

      <div className="relative w-full max-w-4xl">
        <div className="h-12 overflow-hidden rounded-full border-2 border-border bg-muted/30">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
              hit
                ? "from-emerald-400 via-emerald-500 to-emerald-600"
                : "from-primary/80 to-primary",
            )}
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-3 text-center font-mono text-2xl font-semibold tabular-nums">
          {pct}%
        </p>
      </div>

      {top && (
        <p className="mt-4 text-2xl text-muted-foreground">
          Leading contributor:{" "}
          <span className="font-semibold text-foreground">
            {displayName(top)}
          </span>{" "}
          · {top.policies} {top.policies === 1 ? "policy" : "policies"}
        </p>
      )}

      {hit && (
        <p className="text-3xl font-semibold text-emerald-500">
          🎉 The team crushed it.
        </p>
      )}
    </div>
  );
}
