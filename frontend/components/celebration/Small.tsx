"use client";

import { cn } from "@/lib/utils";

import type { CelebrationEvent } from "./CelebrationProvider";
import { TYPE_META } from "./tiers";

export function Small({ event }: { event: CelebrationEvent }) {
  const meta = TYPE_META[event.type];
  return (
    <div
      key={`${event.type}:${event.title}`}
      className="celebration-small-enter pointer-events-none fixed bottom-6 right-6 z-[1010]"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-2.5 rounded-full border bg-card py-1.5 pl-1.5 pr-4 shadow-lg ring-1",
          meta.ring,
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-sm",
            meta.chip,
          )}
          aria-hidden
        >
          {meta.emoji}
        </span>
        <span className="text-sm font-medium leading-none">{event.title}</span>
      </div>
    </div>
  );
}
