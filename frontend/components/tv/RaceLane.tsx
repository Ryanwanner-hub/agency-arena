"use client";

import { Crown } from "lucide-react";

import { Avatar } from "@/components/avatar/Avatar";
import { displayName, type LeaderboardEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

/** A single lane in the horse race — agent's avatar slides along a
 * horizontal track. Position is driven by ``policies / monthlyGoal``,
 * smoothed with a CSS transition so increments feel like the racer
 * pulled forward (rather than teleporting).
 *
 * No Framer Motion — ``transform: translateX(<%>)`` + ``transition`` is
 * enough, and keeps the bundle small. */
export function RaceLane({
  entry,
  monthlyGoal,
  isLeader,
  neckAndNeck,
}: {
  entry: LeaderboardEntry;
  monthlyGoal: number;
  /** True when this is the lead racer (longest lead, possibly tied). */
  isLeader: boolean;
  /** Highlight when within 5 policies of another racer. */
  neckAndNeck: boolean;
}) {
  const policies = entry.policies;
  const pct = Math.min(100, (policies / Math.max(1, monthlyGoal)) * 100);
  const finished = policies >= monthlyGoal;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card/40 px-5 py-4 backdrop-blur",
        isLeader && "border-amber-300/60 ring-2 ring-amber-300/40",
        neckAndNeck && "border-rose-400/50",
      )}
    >
      {/* Header row: avatar, name, score, optional crown */}
      <div className="mb-3 flex items-center gap-3">
        <Avatar
          name={displayName(entry)}
          avatarUrl={entry.avatar_url}
          avatarPreset={entry.avatar_preset}
          size="md"
          frame={isLeader ? "gold" : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-2xl font-semibold tracking-tight">
            {displayName(entry)}
            {isLeader && (
              <Crown className="h-5 w-5 shrink-0 text-amber-400" />
            )}
          </p>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">
            {entry.role.replace(/_/g, " ")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold tabular-nums">
            {policies}
            <span className="text-base font-medium text-muted-foreground">
              {" / "}
              {monthlyGoal}
            </span>
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            policies
          </p>
        </div>
      </div>

      {/* The track. The runner sits absolutely positioned and slides via
          translateX. The percent is clamped so a 110% sale doesn't
          overflow. */}
      <div className="relative h-10 overflow-hidden rounded-full border border-border bg-muted/30">
        {/* Lane stripes — purely decorative, gives a sense of forward
            motion when the runner moves. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(90deg,transparent,transparent_28px,hsl(var(--muted-foreground)/0.3)_28px,hsl(var(--muted-foreground)/0.3)_30px)]"
        />

        {/* Filled track behind the runner. */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
            finished
              ? "from-emerald-400 via-emerald-500 to-emerald-600"
              : isLeader
                ? "from-amber-400 to-amber-500"
                : "from-primary/70 to-primary",
          )}
          style={{ width: `${pct}%` }}
        />

        {/* Runner — the avatar emoji. translateX is in % of the track so
            the runner stays glued to the head of the filled bar. */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-1000 ease-out"
          style={{ left: `calc(${pct}% - 22px)` }}
          aria-hidden
        >
          <span
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-full text-2xl ring-2 ring-card",
              finished
                ? "bg-emerald-500/90 text-white tv-runner-finished"
                : isLeader
                  ? "bg-amber-400/90 text-amber-950 tv-runner-leader"
                  : "bg-card text-foreground",
            )}
          >
            🐎
          </span>
        </div>

        {/* Finish line on the right edge. */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-foreground/60 via-foreground/30 to-foreground/60"
        />
      </div>

      {neckAndNeck && !finished && (
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-[0.3em] text-rose-400">
          Neck & neck
        </p>
      )}
    </div>
  );
}
