"use client";

import { Avatar } from "@/components/avatar/Avatar";
import { displayName } from "@/lib/api";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export type WeeklyPremiumAgent = {
  agent_id: number;
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  avatar_preset: string | null;
  goal: number;
  total: number;
  /** Mon → Sun premiums; length 7. */
  days: number[];
};

export type WeeklyPremiumReport = {
  week_start: string;
  week_end: string;
  agents: WeeklyPremiumAgent[];
};

function fmtMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

/** TV panel: per-agent weekly premium tracker with Mon→Sun day bars
 * + progress toward each agent's individual goal. Replaces the badge
 * achievements panel in the TV rotation. */
export function WeeklyPremiumPanel({
  report,
}: {
  report: WeeklyPremiumReport;
}) {
  const { agents } = report;

  if (agents.length === 0) {
    return (
      <div className="m-auto text-2xl text-muted-foreground">
        No active agents — add one to start tracking the week.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 self-start">
      {/* Sub-header — week range + a quick count. */}
      <div className="flex flex-wrap items-center justify-between rounded-2xl border bg-card/30 px-5 py-3 text-sm uppercase tracking-[0.3em] text-muted-foreground">
        <span>{agents.length} agents · this week</span>
        <span>Mon → Sun · premium $</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {agents.map((a) => (
          <AgentRow key={a.agent_id} agent={a} />
        ))}
      </div>
    </div>
  );
}

function AgentRow({ agent }: { agent: WeeklyPremiumAgent }) {
  const pct = Math.min(
    100,
    Math.round((agent.total / Math.max(1, agent.goal)) * 100),
  );
  const hit = agent.total >= agent.goal;
  // Scale day heights to the largest day's premium so the bars stay
  // legible even when the week is small.
  const peak = Math.max(1, ...agent.days);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/40 px-5 py-4 backdrop-blur",
        hit && "border-emerald-300/60 ring-2 ring-emerald-300/40",
      )}
    >
      <div className="flex items-center gap-4">
        {/* Identity column */}
        <div className="flex w-48 shrink-0 items-center gap-3">
          <Avatar
            name={displayName(agent)}
            avatarUrl={agent.avatar_url}
            avatarPreset={agent.avatar_preset}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight">
              {displayName(agent)}
            </p>
          </div>
        </div>

        {/* Day-bar column — fixed-width grid so all rows align. */}
        <div className="flex flex-1 items-end gap-2">
          {agent.days.map((amount, i) => {
            const pctOfPeak = (amount / peak) * 100;
            const isToday = i === todayWeekdayOffset();
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex h-16 w-full items-end justify-center">
                  <div
                    className={cn(
                      "w-full rounded-md transition-[height] duration-700 ease-out",
                      amount === 0
                        ? "h-1 bg-muted"
                        : hit
                          ? "bg-gradient-to-t from-emerald-500 to-emerald-300"
                          : "bg-gradient-to-t from-primary/70 to-primary",
                    )}
                    style={{
                      height: amount === 0 ? "4px" : `${Math.max(8, pctOfPeak)}%`,
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    amount > 0 ? "text-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {amount > 0 ? fmtMoney(amount) : "—"}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold uppercase",
                    isToday
                      ? "text-primary"
                      : "text-muted-foreground/70",
                  )}
                >
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total + goal column */}
        <div className="w-52 shrink-0 text-right">
          <p className="font-mono text-3xl font-bold tabular-nums">
            {fmtMoney(agent.total)}
          </p>
          <p className="text-sm text-muted-foreground">
            of {fmtMoney(agent.goal)} goal
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
                hit
                  ? "from-emerald-400 to-emerald-500"
                  : "from-primary/70 to-primary",
              )}
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
          <p
            className={cn(
              "mt-1 text-xs font-semibold uppercase tracking-wider",
              hit ? "text-emerald-500" : "text-muted-foreground",
            )}
          >
            {hit ? "Goal hit 🎉" : `${pct}%`}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Index 0..6 for Mon..Sun in the user's local time. Used to highlight
 * today's day bar. */
function todayWeekdayOffset(): number {
  const d = new Date();
  return (d.getDay() + 6) % 7; // shift Sun=0..Sat=6 to Mon=0..Sun=6
}
