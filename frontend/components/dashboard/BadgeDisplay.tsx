import { Award } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EarnedBadge } from "@/lib/api";

const BADGE_ACCENT: Record<string, string> = {
  "First Sale": "from-amber-400 to-orange-500",
  "Quote Machine": "from-blue-400 to-indigo-500",
  "Streak Starter": "from-orange-400 to-rose-500",
  "Top Closer": "from-emerald-400 to-teal-500",
  "Referral Champ": "from-violet-400 to-purple-500",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Reusable badge list. Two layouts:
 * - "list" — one row per badge with icon + description + earned date (default)
 * - "grid" — compact 2-column grid, just icon + name (good for sidebars)
 */
export function BadgeDisplay({
  badges,
  layout = "list",
  emptyMessage = "No badges yet.",
}: {
  badges: EarnedBadge[];
  layout?: "list" | "grid";
  emptyMessage?: string;
}) {
  if (badges.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  if (layout === "grid") {
    return (
      <ul className="grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <li
            key={b.id}
            className="flex items-start gap-2 rounded-md border bg-muted/20 p-2.5"
          >
            <span
              className={cn(
                "badge-tile mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white",
                BADGE_ACCENT[b.name] ?? "from-zinc-400 to-zinc-500",
              )}
            >
              <Award className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{b.name}</p>
              {b.description && (
                <p className="line-clamp-2 text-[10px] text-muted-foreground">
                  {b.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {badges.map((b) => (
        <li
          key={b.id}
          className="flex items-start gap-3 rounded-md border bg-muted/30 p-3"
        >
          <div
            className={cn(
              "badge-tile mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white",
              BADGE_ACCENT[b.name] ?? "from-zinc-400 to-zinc-500",
            )}
          >
            <Award className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{b.name}</p>
            {b.description && (
              <p className="text-xs text-muted-foreground">{b.description}</p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Earned {formatTimestamp(b.earned_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
