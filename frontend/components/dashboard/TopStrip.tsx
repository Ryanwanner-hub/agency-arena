"use client";

import { FileText, Shield, Trophy, Users } from "lucide-react";

import { Avatar } from "@/components/avatar/Avatar";
import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { displayName, type LeaderboardEntry, type LeaderboardResponse } from "@/lib/api";

type Hero = {
  title: string;
  agent: LeaderboardEntry | null;
  value: number;
  suffix: string;
  icon: typeof Trophy;
  /** Gradient for the icon chip (solid, saturated). */
  chip: string;
  /** Soft wash across the card top — alpha-based so it works on dark themes. */
  wash: string;
};

function leaderBy(
  entries: LeaderboardEntry[],
  key: keyof LeaderboardEntry,
): LeaderboardEntry | null {
  let best: LeaderboardEntry | null = null;
  for (const e of entries) {
    const v = e[key] as number;
    if (v <= 0) continue;
    if (!best || v > (best[key] as number)) best = e;
  }
  return best;
}

export function TopStrip({ leaderboard }: { leaderboard: LeaderboardResponse }) {
  const { settings } = useManagerSettings();
  const entries = leaderboard.entries;
  const ofTheDay = entries[0] ?? null;
  const mostQuotes = leaderBy(entries, "quotes");
  const mostPolicies = leaderBy(entries, "policies");
  const referralLeader = leaderBy(entries, "referrals");

  const cards: Hero[] = [
    {
      title: "Agent of the Day",
      agent: ofTheDay,
      value: ofTheDay?.total_points ?? 0,
      suffix: "pts",
      icon: Trophy,
      chip: "from-amber-400 to-amber-600",
      wash: "from-amber-400/15",
    },
    {
      title: "Most Quotes",
      agent: mostQuotes,
      value: mostQuotes?.quotes ?? 0,
      suffix: "quotes",
      icon: FileText,
      chip: "from-sky-400 to-blue-600",
      wash: "from-blue-400/15",
    },
    {
      title: "Most Policies",
      agent: mostPolicies,
      value: mostPolicies?.policies ?? 0,
      suffix: "bound",
      icon: Shield,
      chip: "from-emerald-400 to-emerald-600",
      wash: "from-emerald-400/15",
    },
    ...(settings.display.showReferrals
      ? [
          {
            title: "Referral Leader",
            agent: referralLeader,
            value: referralLeader?.referrals ?? 0,
            suffix: "in",
            icon: Users,
            chip: "from-violet-400 to-violet-600",
            wash: "from-violet-400/15",
          } as Hero,
        ]
      : []),
  ];

  const cols = cards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", cols)}>
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title} className="card-interactive overflow-hidden">
            <CardContent className="relative p-5">
              <div
                className={cn(
                  "top-strip-accent absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent",
                  c.wash,
                )}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {c.title}
                  </p>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md",
                      c.chip,
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {c.agent ? (
                    <Avatar
                      name={displayName(c.agent)}
                      avatarUrl={c.agent.avatar_url}
                      avatarPreset={c.agent.avatar_preset}
                      size="sm"
                    />
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-base font-semibold">
                    {c.agent ? displayName(c.agent) : "—"}
                  </p>
                </div>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="stat-number text-3xl font-bold leading-none">
                    {c.value}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {c.suffix}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
