"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/** Compact trend chip — shows ±% versus a prior period at a glance.
 *
 * - Pass ``pct = null`` when the prior period had zero points; renders
 *   "↑ NEW" rather than dividing by zero.
 * - "Flat" threshold of 0.5% suppresses jitter from small sample sizes.
 */
export function MomentumIndicator({
  delta,
  pct,
  size = "sm",
  className,
}: {
  delta: number;
  pct: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const text = size === "md" ? "text-xs" : "text-[11px]";

  if (pct === null) {
    if (delta === 0) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium uppercase tracking-wider text-emerald-600",
          size === "md" ? "text-xs" : "text-[10px]",
          className,
        )}
      >
        <ArrowUp className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} /> new
      </span>
    );
  }

  if (Math.abs(pct) < 0.5) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-muted-foreground",
          text,
          className,
        )}
      >
        <Minus className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} /> 0%
      </span>
    );
  }

  const positive = pct > 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono font-medium",
        text,
        positive ? "text-emerald-600" : "text-rose-600",
        className,
      )}
      title={`${delta >= 0 ? "+" : ""}${delta} pts vs prior period`}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {Math.abs(Math.round(pct))}%
    </span>
  );
}
