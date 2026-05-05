"use client";

import { Trophy, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSound } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

export type TVPanelKey =
  | "leaderboard"
  | "monthly_race"
  | "wins"
  | "badges"
  | "contests"
  | "team_goal";

const PANEL_TITLE: Record<TVPanelKey, string> = {
  leaderboard: "Today's leaderboard",
  monthly_race: "Monthly sales race 🏁",
  wins: "Recent wins",
  badges: "Badge achievements",
  contests: "Active contests",
  team_goal: "Team goal",
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function TVHeader({ panel }: { panel: TVPanelKey }) {
  const { muted, setMuted } = useSound();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // Refresh once per second so the clock minute roll-over is snappy.
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const SoundIcon = muted ? VolumeX : Volume2;

  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-8 lg:px-12 lg:py-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-primary" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Agency Arena · Live
          </p>
          <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">
            {PANEL_TITLE[panel]}
          </h1>
        </div>
      </div>

      <div className="flex items-end gap-6">
        <div className="text-right leading-none">
          <p className="font-mono text-4xl font-semibold tabular-nums">
            {formatTime(now)}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {formatDate(now)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          className={cn(
            "rounded-full border p-3 transition-colors",
            muted
              ? "border-border text-muted-foreground hover:bg-muted"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
          )}
        >
          <SoundIcon className="h-5 w-5" />
        </button>

        <Link
          href="/dashboard"
          aria-label="Exit TV mode"
          className="rounded-full border p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
