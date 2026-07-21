"use client";

import { Lightbulb, Shield, Snowflake, Target, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { displayName, type AgentProfile, type LeaderboardResponse } from "@/lib/api";
import { computeStreak } from "@/lib/status";
import { cn } from "@/lib/utils";

type Action = {
  icon: typeof Target;
  iconClass: string;
  title: string;
  subtitle: string;
};

/** Derive a small set of actionable suggestions from the leaderboard
 * + agent profiles. Pure function — runs client-side from data already on
 * the page, no extra fetches.
 */
function buildActions(
  leaderboard: LeaderboardResponse,
  profiles: AgentProfile[],
): Action[] {
  const actions: Action[] = [];
  const profileById = new Map(profiles.map((p) => [p.agent.id, p]));

  // 1. Tight gap between top two — flip-the-leaderboard nudge.
  const [first, second] = leaderboard.entries;
  if (first && second) {
    const gap = first.total_points - second.total_points;
    if (gap > 0 && gap <= 30) {
      actions.push({
        icon: Target,
        iconClass: "text-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20",
        title: `${displayName(second)} is ${gap} pts from #1`,
        subtitle:
          gap <= 10
            ? "One activity could flip the leaderboard."
            : "One policy bound (+30) takes the lead.",
      });
    }
  }

  // 2. Open quotes that haven't converted today.
  for (const entry of leaderboard.entries) {
    if (entry.quotes >= 2 && entry.policies === 0) {
      actions.push({
        icon: Shield,
        iconClass: "text-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20",
        title: `${displayName(entry)} has ${entry.quotes} open quotes`,
        subtitle: "Help close one — that's +30 pts and a celebration.",
      });
      break;
    }
  }

  // 3. Streaks at risk — anyone with a 3+ day streak who hasn't logged today.
  for (const entry of leaderboard.entries) {
    if (entry.total_points > 0) continue;
    const profile = profileById.get(entry.agent_id);
    if (!profile) continue;
    const streak = computeStreak(profile.daily_history);
    if (streak >= 3) {
      actions.push({
        icon: Snowflake,
        iconClass: "text-rose-500 bg-rose-500/10 ring-1 ring-rose-500/20",
        title: `${displayName(entry)} hasn't logged today`,
        subtitle: `${streak}-day streak at risk — a quick activity keeps it alive.`,
      });
      break;
    }
  }

  // 4. Lift up the referral leader.
  const refLeader = [...leaderboard.entries].sort(
    (a, b) => b.referrals - a.referrals,
  )[0];
  if (refLeader && refLeader.referrals >= 2 && actions.length < 3) {
    actions.push({
      icon: Users,
      iconClass: "text-violet-500 bg-violet-500/10 ring-1 ring-violet-500/20",
      title: `${displayName(refLeader)} leads referrals (${refLeader.referrals})`,
      subtitle: "Ask them to share their script with the team.",
    });
  }

  return actions.slice(0, 3);
}

export function RecommendedActionsCard({
  leaderboard,
  profiles,
}: {
  leaderboard: LeaderboardResponse;
  profiles: AgentProfile[];
}) {
  const actions = buildActions(leaderboard, profiles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Recommended actions
        </CardTitle>
        <CardDescription>
          Small nudges based on today's leaderboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {actions.length === 0 ? (
          <div className="mx-5 mb-5 rounded-md border border-dashed bg-muted/20 px-4 py-6 text-center">
            <Lightbulb className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The team is steady — check back after the next activity.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      a.iconClass,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.subtitle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
