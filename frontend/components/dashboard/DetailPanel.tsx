"use client";

import { Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Avatar } from "@/components/avatar/Avatar";
import { AvatarPicker } from "@/components/avatar/AvatarPicker";
import { BadgeDisplay } from "@/components/dashboard/BadgeDisplay";
import { cn } from "@/lib/utils";
import { displayName, type Agent, type AgentProfile } from "@/lib/api";
import { statusToAvatarStatus, type AgentStatus } from "@/lib/status";

const ACTIVITY_LABEL: Record<string, string> = {
  quote_started: "Quote started",
  quote_completed: "Quote completed",
  policy_bound: "Policy bound",
  multi_policy_bonus: "Multi-policy bonus",
  referral_received: "Referral received",
  referral_converted: "Referral converted",
  followup_completed: "Follow-up done",
  speed_to_contact: "Speed to contact",
  review_requested: "Review requested",
  review_received: "Review received",
  cross_sell_attempt: "Cross-sell attempt",
  cross_sell_sold: "Cross-sell sold",
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DetailPanel({
  profile,
  rank,
  status,
  onClose,
  onAgentUpdated,
}: {
  profile: AgentProfile | null;
  rank?: number;
  status?: AgentStatus;
  onClose: () => void;
  onAgentUpdated?: (agent: Agent) => void;
}) {
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // If the avatar picker is open, let it close itself first.
      if (picking) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile, picking, onClose]);

  if (!profile) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l bg-card shadow-xl"
        role="dialog"
        aria-label={`${displayName(profile.agent)} details`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="group relative shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Customize avatar"
            >
              <Avatar
                name={displayName(profile.agent)}
                avatarUrl={profile.agent.avatar_url}
                avatarPreset={profile.agent.avatar_preset}
                backgroundColor={profile.agent.avatar_color}
                frame={profile.agent.avatar_frame as never}
                size="lg"
                rank={rank}
                // Leaderboard-computed status wins on the dashboard;
                // the agent's stored effect is the fallback.
                status={
                  status
                    ? statusToAvatarStatus(status)
                    : (profile.agent.status_effect as never)
                }
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            </button>
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                {displayName(profile.agent)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {profile.agent.role.replace(/_/g, " ")}
                {profile.agent.title ? ` · ${profile.agent.title}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close detail panel"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-5">
          <section className="grid grid-cols-3 gap-2">
            <Stat label="Lifetime pts" value={profile.lifetime.total_points} />
            <Stat label="Policies" value={profile.lifetime.policies} />
            <Stat
              label="Close rate"
              value={
                profile.lifetime.quotes > 0
                  ? `${Math.round(profile.lifetime.close_rate * 100)}%`
                  : "—"
              }
            />
          </section>

          <Section title="Trends" subtitle={`Daily points · last ${profile.daily_history.length} days`}>
            <div className="h-44 w-full">
              <ResponsiveContainer>
                <LineChart
                  data={profile.daily_history}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDay}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 6,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => new Date(d).toLocaleDateString()}
                    formatter={(v: number) => [`${v} pts`, "Points"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="total_points"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          <Section title="Badges" subtitle={`${profile.badges.length} earned`}>
            <BadgeDisplay badges={profile.badges} />
          </Section>

          <Section
            title="Recent activity"
            subtitle={`Last ${profile.recent_activity.length} events`}
          >
            {profile.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {profile.recent_activity.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {ACTIVITY_LABEL[a.activity_type] ?? a.activity_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(a.created_at)}
                        {a.source ? ` · ${a.source.replace(/_/g, " ")}` : ""}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm font-semibold",
                        a.points > 0 ? "text-emerald-600" : "text-muted-foreground",
                      )}
                    >
                      +{a.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </aside>

      {picking && (
        <AvatarPicker
          agent={profile.agent}
          onClose={() => setPicking(false)}
          onSaved={(updated) => {
            onAgentUpdated?.(updated);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && (
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}
