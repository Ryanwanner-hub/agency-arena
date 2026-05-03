"use client";

import { cn } from "@/lib/utils";

import type { CelebrationEvent } from "./CelebrationProvider";
import { TYPE_META } from "./tiers";

export function Medium({ event }: { event: CelebrationEvent }) {
  const meta = TYPE_META[event.type];
  return (
    <div
      key={`${event.type}:${event.title}:${event.description ?? ""}`}
      className="celebration-popup-enter pointer-events-none fixed left-1/2 top-24 z-[1010]"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-md items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-2xl ring-1",
          meta.ring,
        )}
      >
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-2xl",
            meta.chip,
          )}
          aria-hidden
        >
          {meta.emoji}
        </div>
        <div className="min-w-0">
          <div
            className={cn(
              "mb-0.5 text-[10px] font-semibold uppercase tracking-wider",
              meta.accentText,
            )}
          >
            {meta.label}
          </div>
          <div className="text-sm font-semibold leading-tight">
            {event.title}
          </div>
          {event.description && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {event.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
