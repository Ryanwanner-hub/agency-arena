"use client";

import { Avatar } from "@/components/avatar/Avatar";
import { displayName, type LeaderboardEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

const RANK_TILE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900",
  3: "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
};

const RANK_FRAME: Record<number, "gold" | "silver" | "bronze"> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export function LeaderboardPanel({
  entries,
  rankDeltas,
}: {
  entries: LeaderboardEntry[];
  rankDeltas: Record<number, number>;
}) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="flex w-full flex-col gap-6 self-start">
      {/* Top 3 spotlight — three hero cards. */}
      <div
        className={cn(
          "grid gap-5",
          top3.length === 1 && "grid-cols-1",
          top3.length === 2 && "grid-cols-2",
          top3.length >= 3 && "grid-cols-3",
        )}
      >
        {top3.map((entry) => (
          <SpotlightCard
            key={entry.agent_id}
            entry={entry}
            delta={rankDeltas[entry.agent_id]}
          />
        ))}
      </div>

      {/* Rest of the leaderboard — compact rows. */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {rest.map((entry) => (
            <CompactRow
              key={entry.agent_id}
              entry={entry}
              delta={rankDeltas[entry.agent_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightCard({
  entry,
  delta,
}: {
  entry: LeaderboardEntry;
  delta?: number;
}) {
  const isFirst = entry.rank === 1;
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-4 rounded-3xl border bg-card/40 px-6 py-7 backdrop-blur",
        delta !== undefined && delta > 0 && "tv-rank-up",
        delta !== undefined && delta < 0 && "tv-rank-down",
        isFirst && "border-amber-300/60 ring-2 ring-amber-300/40",
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-3xl font-black",
          RANK_TILE[entry.rank] ??
            "bg-muted text-muted-foreground",
        )}
      >
        {entry.rank}
      </div>

      <Avatar
        name={displayName(entry)}
        avatarUrl={entry.avatar_url}
        avatarPreset={entry.avatar_preset}
        size="xl"
        frame={RANK_FRAME[entry.rank] ?? null}
      />

      <div className="text-center">
        <p className="truncate text-3xl font-semibold leading-tight tracking-tight">
          {displayName(entry)}
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          {entry.role.replace(/_/g, " ")}
        </p>
      </div>

      <div className="text-center">
        <p className="font-mono text-7xl font-bold leading-none tabular-nums">
          {entry.total_points}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          points
        </p>
      </div>

      <div className="grid w-full grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center">
        <Stat label="quotes" value={entry.quotes} />
        <Stat label="policies" value={entry.policies} />
        <Stat label="referrals" value={entry.referrals} />
      </div>

      {delta !== undefined && delta !== 0 && (
        <span
          className={cn(
            "absolute right-4 top-4 rounded-full px-3 py-1 text-base font-bold",
            delta > 0
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-rose-500/20 text-rose-400",
          )}
        >
          {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

function CompactRow({
  entry,
  delta,
}: {
  entry: LeaderboardEntry;
  delta?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 rounded-2xl border bg-card/30 px-6 py-4",
        delta !== undefined && delta > 0 && "tv-rank-up",
        delta !== undefined && delta < 0 && "tv-rank-down",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 font-mono text-2xl font-black text-muted-foreground">
        {entry.rank}
      </div>
      <Avatar
        name={displayName(entry)}
        avatarUrl={entry.avatar_url}
        avatarPreset={entry.avatar_preset}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-2xl font-semibold tracking-tight">
          {displayName(entry)}
        </p>
        <p className="text-sm text-muted-foreground">
          {entry.role.replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex items-baseline gap-6 text-right">
        <Stat label="q" value={entry.quotes} />
        <Stat label="pol" value={entry.policies} />
        <div>
          <p className="font-mono text-4xl font-bold tabular-nums">
            {entry.total_points}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            pts
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
