import { STATUS_META, type AgentStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/** 5-bar signal-strength meter. Bars grow in height left-to-right, the
 * filled count matches the status's intensity (1–5). Theme-aware: filled
 * bars use the status's color, empty bars use ``bg-muted``. */
export function MomentumMeter({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <div
      className={cn("flex items-end gap-0.5", className)}
      role="img"
      aria-label={`Momentum: ${meta.label}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          // Grow each bar by +2px per step. Tiny enough to fit a row,
          // tall enough to read from a couple feet away.
          style={{ height: `${4 + i * 2}px` }}
          className={cn(
            "w-1 rounded-sm",
            i <= meta.intensity ? meta.meterColor : "bg-muted",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
