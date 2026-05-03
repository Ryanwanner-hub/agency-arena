"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { useSound, type SoundKey } from "./SoundProvider";

const PREVIEW_KEY: SoundKey = "policy_bound";

export function SoundControl() {
  const { muted, volume, setMuted, setVolume, play, ready } = useSound();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
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

  // Choose the right speaker icon based on current state.
  const Icon = muted ? VolumeX : volume < 0.4 ? Volume1 : Volume2;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Sound settings"
        aria-expanded={open}
        className={cn(
          "rounded-md p-1.5 transition-colors",
          muted
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sound
            </p>
            <span className="text-[10px] text-muted-foreground">
              {ready ? "ready" : "loading…"}
            </span>
          </div>

          <label className="mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/40">
            <div>
              <p className="text-sm font-medium">Mute</p>
              <p className="text-xs text-muted-foreground">
                Silences all in-app sounds
              </p>
            </div>
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
          </label>

          <div className={cn("space-y-1.5 px-2", muted && "opacity-50")}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Volume</span>
              <span className="font-mono text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              disabled={muted}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            disabled={muted || !ready}
            onClick={() => play(PREVIEW_KEY)}
            className="mt-3 w-full rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Preview
          </button>
        </div>
      )}
    </div>
  );
}
