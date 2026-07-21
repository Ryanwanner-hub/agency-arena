"use client";

import { Trophy } from "lucide-react";

import { Avatar } from "@/components/avatar/Avatar";
import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayName, type AgentProfile } from "@/lib/api";

const WIN_TYPES = new Set([
  "policy_bound",
  "multi_policy_bonus",
  "referral_converted",
  "cross_sell_sold",
  "review_received",
]);

const TYPE_LABEL: Record<string, string> = {
  policy_bound: "Policy bound",
  multi_policy_bonus: "Multi-policy bonus",
  referral_converted: "Referral converted",
  cross_sell_sold: "Cross-sell sold",
  review_received: "5-star review",
};

type Win = {
  id: number;
  agent: AgentProfile["agent"];
  activity_type: string;
  points: number;
  premium: number | null;
  created_at: string;
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentWinsFeed({
  profiles,
  limit = 6,
}: {
  profiles: AgentProfile[];
  limit?: number;
}) {
  const { settings } = useManagerSettings();
  const showPremium = settings.display.showPremium;
  const wins: Win[] = [];
  for (const p of profiles) {
    for (const a of p.recent_activity) {
      if (WIN_TYPES.has(a.activity_type)) {
        wins.push({
          id: a.id,
          agent: p.agent,
          activity_type: a.activity_type,
          points: a.points,
          premium: a.premium,
          created_at: a.created_at,
        });
      }
    }
  }
  wins.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visible = wins.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Recent wins
          </CardTitle>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="live-dot" aria-hidden />
            Live
          </span>
        </div>
        <CardDescription>Latest celebrations across the team.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <div className="mx-5 mb-5 rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center">
            <Trophy className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm font-medium">No wins yet today</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bound policies and conversions will land here.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((w) => (
              <li
                key={`${w.agent.id}-${w.id}`}
                className="flex items-center gap-3 px-5 py-3"
              >
                <Avatar
                  name={displayName(w.agent)}
                  avatarUrl={w.agent.avatar_url}
                  avatarPreset={w.agent.avatar_preset}
                  backgroundColor={w.agent.avatar_color}
                  frame={w.agent.avatar_frame as never}
                  status={w.agent.status_effect as never}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {displayName(w.agent)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[w.activity_type] ?? w.activity_type}
                    {showPremium && w.premium
                      ? ` · $${w.premium.toLocaleString()}`
                      : ""}
                    {" · "}
                    {relativeTime(w.created_at)}
                  </p>
                </div>
                <span className="stat-number rounded-full bg-emerald-500/10 px-2 py-0.5 text-sm font-bold text-emerald-500 ring-1 ring-emerald-500/20">
                  +{w.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
