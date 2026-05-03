"use client";

import { cn } from "@/lib/utils";

import type { CelebrationEvent } from "./CelebrationProvider";
import { TYPE_META } from "./tiers";

export function Large({ event }: { event: CelebrationEvent }) {
  const meta = TYPE_META[event.type];
  return (
    <div
      key={`${event.type}:${event.title}:${event.description ?? ""}`}
      className="pointer-events-none fixed inset-0 z-[1020] flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      {/* Soft radial wash — fades in/out on its own timeline so the page
          underneath is still readable. pointer-events-none keeps it
          non-blocking. */}
      <div
        className="celebration-large-backdrop absolute inset-0"
        aria-hidden
      />

      <div className="celebration-large-enter relative px-8 text-center">
        <div className="celebration-large-emoji mb-4 text-8xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          {meta.emoji}
        </div>
        <p
          className={cn(
            "mb-3 text-xs font-semibold uppercase tracking-[0.4em]",
            "text-white/80",
          )}
        >
          {meta.label}
        </p>
        <h2 className="text-5xl font-bold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] md:text-7xl">
          {event.title}
        </h2>
        {event.description && (
          <p className="mt-4 text-xl text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] md:text-2xl">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
