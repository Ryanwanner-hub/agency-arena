"use client";

import type { AgentProfile } from "@/lib/api";
import { displayName } from "@/lib/api";

const TICKER_TYPES = new Set([
  "policy_bound",
  "multi_policy_bonus",
  "referral_converted",
  "cross_sell_sold",
  "review_received",
  "referral_received",
]);

const TYPE_LABEL: Record<string, string> = {
  policy_bound: "policy bound",
  multi_policy_bonus: "multi-policy bonus",
  referral_converted: "referral converted",
  cross_sell_sold: "cross-sell sold",
  review_received: "5-star review",
  referral_received: "referral in",
};

const TYPE_ICON: Record<string, string> = {
  policy_bound: "🎯",
  multi_policy_bonus: "💎",
  referral_converted: "🤝",
  cross_sell_sold: "🔁",
  review_received: "⭐",
  referral_received: "📥",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type TickerWin = {
  id: number;
  agent: string;
  type: string;
  premium: number | null;
  time: string;
};

/** Bottom-of-screen ESPN-style scrolling marquee of recent wins.
 * Duplicates the content so the loop stays seamless. */
export function TVTicker({
  profiles,
  limit = 16,
}: {
  profiles: AgentProfile[];
  limit?: number;
}) {
  const wins: TickerWin[] = [];
  for (const p of profiles) {
    for (const a of p.recent_activity) {
      if (TICKER_TYPES.has(a.activity_type)) {
        wins.push({
          id: a.id,
          agent: displayName(p.agent),
          type: a.activity_type,
          premium: a.premium,
          time: a.created_at,
        });
      }
    }
  }
  wins.sort((a, b) => b.time.localeCompare(a.time));
  const items = wins.slice(0, limit);

  if (items.length === 0) {
    return (
      <div className="border-t border-border/60 bg-background/60 px-6 py-3 text-center text-base text-muted-foreground sm:px-8 lg:px-12">
        Recent wins will scroll here as the team logs them.
      </div>
    );
  }

  // Duplicate for seamless loop. Using a plain ul would line-wrap; the
  // outer wrapper sets overflow-hidden + the inner track translates -50%.
  return (
    <div className="overflow-hidden border-t border-border/60 bg-background/60 py-3">
      <div className="tv-ticker-track flex w-max items-center gap-12 whitespace-nowrap px-6 text-xl">
        {[...items, ...items].map((w, i) => (
          <span
            key={`${w.id}-${i}`}
            className="flex items-center gap-3 text-foreground"
          >
            <span className="text-2xl" aria-hidden>
              {TYPE_ICON[w.type] ?? "🎉"}
            </span>
            <span className="font-semibold">{w.agent}</span>
            <span className="text-muted-foreground">
              {TYPE_LABEL[w.type] ?? w.type}
              {w.premium ? ` · $${w.premium.toLocaleString()}` : ""}
            </span>
            <span className="text-muted-foreground/70">
              {relativeTime(w.time)}
            </span>
            <span className="text-muted-foreground/40" aria-hidden>
              •
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
