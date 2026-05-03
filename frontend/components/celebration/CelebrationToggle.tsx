"use client";

import { Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import {
  useCelebrate,
  useCelebrationSettings,
  type CelebrationEvent,
} from "./CelebrationProvider";

// Cycles through every tier × event-type bucket so the demo button proves
// the engine end to end across the new event taxonomy.
const DEMO_EVENTS: CelebrationEvent[] = [
  // ─── Small ───
  { type: "badge_earned", title: "Top Closer earned" },
  { type: "streak_continued", title: "Streak +1", description: "Day 7." },
  { type: "referral_received", title: "Referral in", description: "From Local Realty Group." },

  // ─── Medium ───
  {
    type: "policy_bound",
    title: "Policy bound!",
    description: "Sarah just closed a $1,580 policy.",
  },
  {
    type: "referral_converted",
    title: "Referral converted",
    description: "+40 pts.",
  },
  {
    type: "personal_goal_hit",
    title: "Personal goal hit",
    description: "10 quotes this week.",
  },

  // ─── Large ───
  {
    type: "rank_to_top",
    title: "Sarah takes #1",
    description: "First time atop the daily leaderboard.",
  },
  {
    type: "contest_won",
    title: "Quote Quota Quest — won!",
    description: "Marcus beat the field by 12 quotes.",
  },
  {
    type: "team_goal_hit",
    title: "Team goal hit",
    description: "100 policies bound this month. 🎉",
  },
  {
    type: "hat_trick",
    title: "Hat trick!",
    description: "Three policies bound in a single day.",
  },
];

export function CelebrationToggle() {
  const { settings, setSettings } = useCelebrationSettings();
  const celebrate = useCelebrate();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const SoundIcon = settings.sound ? Volume2 : VolumeX;
  const demoIndexRef = useRef(0);

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Celebration settings"
        aria-expanded={open}
        className={cn(
          "rounded-md p-1.5 transition-colors",
          settings.enabled
            ? "text-amber-600 hover:bg-amber-50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Sparkles className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Celebrations
            </p>
            <SoundIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          <ToggleRow
            label="Show celebrations"
            description="Confetti + popup on wins"
            checked={settings.enabled}
            onChange={(v) => setSettings({ enabled: v })}
          />
          <ToggleRow
            label="Play sound"
            description="A short chime"
            checked={settings.sound}
            disabled={!settings.enabled}
            onChange={(v) => setSettings({ sound: v })}
          />

          <button
            type="button"
            disabled={!settings.enabled}
            onClick={() => {
              const evt = DEMO_EVENTS[demoIndexRef.current % DEMO_EVENTS.length];
              demoIndexRef.current += 1;
              celebrate(evt);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trigger demo (cycles tiers)
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 rounded-md p-2 hover:bg-muted/40",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
      />
    </label>
  );
}
