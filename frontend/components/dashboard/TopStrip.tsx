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
  accent: string;
  ringAccent: string;
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
      accent: "text-amber-600",
      ringAccent: "from-amber-100 to-amber-50",
    },
    {
      title: "Most Quotes",
      agent: mostQuotes,
      value: mostQuotes?.quotes ?? 0,
      suffix: "quotes",
      icon: FileText,
      accent: "text-blue-600",
      ringAccent: "from-blue-100 to-blue-50",
    },
    {
      title: "Most Policies",
      agent: mostPolicies,
      value: mostPolicies?.policies ?? 0,
      suffix: "bound",
      icon: Shield,
      accent: "text-emerald-600",
      ringAccent: "from-emerald-100 to-emerald-50",
    },
    ...(settings.display.showReferrals
      ? [
          {
            title: "Referral Leader",
            agent: referralLeader,
            value: referralLeader?.referrals ?? 0,
            suffix: "in",
            icon: Users,
            accent: "text-violet-600",
            ringAccent: "from-violet-100 to-violet-50",
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
          <Card key={c.title} className="overflow-hidden">
            <CardContent className="relative p-5">
              <div
                className={cn(
                  "top-strip-accent absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-60",
                  c.ringAccent,
                )}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {c.title}
                  </p>
                  <Icon className={cn("h-5 w-5", c.accent)} />
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
                  <p className="min-w-0 flex-1 truncate text-lg font-semibold">
                    {c.agent ? displayName(c.agent) : "—"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-mono font-semibold text-foreground">
                    {c.value}
                  </span>{" "}
                  {c.suffix}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
