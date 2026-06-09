"use client";

import { Calendar, Flame } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { HorseRacePanel } from "@/components/tv/HorseRacePanel";
import { LeaderboardPanel } from "@/components/tv/LeaderboardPanel";
import { TeamGoalPanel } from "@/components/tv/TeamGoalPanel";
import { TVHeader, type TVPanelKey } from "@/components/tv/TVHeader";
import { TVOfficeGoal } from "@/components/tv/TVOfficeGoal";
import { TVTicker } from "@/components/tv/TVTicker";
import {
  WeeklyPremiumPanel,
  type WeeklyPremiumReport,
} from "@/components/tv/WeeklyPremiumPanel";
import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import {
  api,
  displayName,
  type AgentProfile,
  type ContestListItem,
  type ContestStandings,
  type LeaderboardResponse,
} from "@/lib/api";
import { formatDateOnly, localDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

// Order matters: monthly_race lands right after today's leaderboard so
// the eye flows from "what just happened today" to "how it shapes the
// month-long race".
const PANELS: TVPanelKey[] = [
  "leaderboard",
  "monthly_race",
  "wins",
  "weekly_premium",
  "contests",
  "team_goal",
];

const REFRESH_MS = 10_000;
const ROTATE_MS = 15_000;
const RANK_DELTA_MS = 14_000;

const WIN_TYPES = new Set([
  "policy_bound",
  "multi_policy_bonus",
  "referral_converted",
  "cross_sell_sold",
  "review_received",
]);

const ACTIVITY_LABEL: Record<string, string> = {
  policy_bound: "Policy bound",
  multi_policy_bonus: "Multi-policy bonus",
  referral_converted: "Referral converted",
  cross_sell_sold: "Cross-sell sold",
  review_received: "5-star review",
};

type WinEntry = {
  id: number;
  agent_id: number;
  agent_name: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  activity_type: string;
  points: number;
  premium: number | null;
  created_at: string;
};

type State = {
  leaderboard: LeaderboardResponse;
  monthlyLeaderboard: LeaderboardResponse;
  profiles: AgentProfile[];
  contests: ContestListItem[];
  /** Standings per contest id — fetched in parallel for the TV
   * Contests panel so each card can show top 3 instead of just metadata. */
  standingsById: Record<number, ContestStandings>;
  weeklyPremium: WeeklyPremiumReport;
};

async function fetchAll(): Promise<State> {
  const [leaderboard, monthlyLeaderboard, weeklyPremium] = await Promise.all([
    api<LeaderboardResponse>("/leaderboard?period=daily"),
    api<LeaderboardResponse>("/leaderboard?period=monthly"),
    api<WeeklyPremiumReport>("/reports/weekly-premium"),
  ]);
  const [profiles, contests] = await Promise.all([
    Promise.all(
      leaderboard.entries.map((e) =>
        api<AgentProfile>(`/agents/${e.agent_id}/profile?recent_count=100`),
      ),
    ),
    api<ContestListItem[]>("/contests"),
  ]);

  // Standings get fetched per-contest. Each one is an independent
  // request; failure of any single contest shouldn't blank the whole
  // panel, so we settle each one and drop failures.
  const standingsResults = await Promise.allSettled(
    contests.map((c) =>
      api<ContestStandings>(`/contests/${c.id}/standings`),
    ),
  );
  const standingsById: Record<number, ContestStandings> = {};
  standingsResults.forEach((res, i) => {
    if (res.status === "fulfilled") standingsById[contests[i].id] = res.value;
  });

  return {
    leaderboard,
    monthlyLeaderboard,
    profiles,
    contests,
    standingsById,
    weeklyPremium,
  };
}

export default function TVPage() {
  const { settings: managerSettings } = useManagerSettings();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<TVPanelKey>("leaderboard");
  const [rankDeltas, setRankDeltas] = useState<Record<number, number>>({});
  const prevRanksRef = useRef<Record<number, number> | null>(null);
  const top3IdsRef = useRef<Set<number> | null>(null);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrate = useCelebrate();

  // Rotate panels every ROTATE_MS
  useEffect(() => {
    const id = setInterval(() => {
      setPanel((p) => PANELS[(PANELS.indexOf(p) + 1) % PANELS.length]);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-refresh every REFRESH_MS
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    async function load() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await fetchAll();
        if (cancelled) return;
        setState(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        inFlight = false;
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Compute rank deltas + fire celebrations on new top-3 entries.
  useEffect(() => {
    if (!state) return;
    const next: Record<number, number> = {};
    state.leaderboard.entries.forEach((e) => {
      next[e.agent_id] = e.rank;
    });

    const prev = prevRanksRef.current;
    if (prev) {
      const deltas: Record<number, number> = {};
      for (const [id, rank] of Object.entries(next)) {
        const previous = prev[Number(id)];
        if (previous !== undefined && previous !== rank) {
          deltas[Number(id)] = previous - rank; // positive = moved up
        }
      }
      if (Object.keys(deltas).length > 0) {
        setRankDeltas(deltas);
        if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
        deltaTimeoutRef.current = setTimeout(
          () => setRankDeltas({}),
          RANK_DELTA_MS,
        );
      }

      // Detect a fresh entry into the top 3 — if so, fire a large celebration.
      // The celebration overlay uses z-1010+ so it layers over the TV mode.
      const prevTop3 = top3IdsRef.current ?? new Set<number>();
      const nextTop3 = new Set<number>(
        state.leaderboard.entries
          .filter((e) => e.rank <= 3)
          .map((e) => e.agent_id),
      );
      const newcomer = state.leaderboard.entries.find(
        (e) => e.rank <= 3 && !prevTop3.has(e.agent_id),
      );
      if (newcomer && prev) {
        // Skip on the very first transition where prev top-3 is empty (first
        // poll). prev being non-null ensures we've seen at least one snapshot.
        if (prevTop3.size > 0) {
          celebrate({
            type: newcomer.rank === 1 ? "rank_to_top" : "rank_change",
            tier: "large",
            title:
              newcomer.rank === 1
                ? `${displayName(newcomer)} takes #1`
                : `${displayName(newcomer)} hits the podium`,
            description: `Now #${newcomer.rank} on today's board.`,
          });
        }
      }
      top3IdsRef.current = nextTop3;
    } else {
      // First snapshot — seed the top-3 set without firing celebrations.
      top3IdsRef.current = new Set(
        state.leaderboard.entries
          .filter((e) => e.rank <= 3)
          .map((e) => e.agent_id),
      );
    }
    prevRanksRef.current = next;
  }, [state, celebrate]);

  useEffect(
    () => () => {
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
    },
    [],
  );

  // Derive panel data from profiles
  const wins = useMemo<WinEntry[]>(() => {
    if (!state) return [];
    const out: WinEntry[] = [];
    state.profiles.forEach((p) => {
      p.recent_activity.forEach((a) => {
        if (WIN_TYPES.has(a.activity_type)) {
          out.push({
            id: a.id,
            agent_id: a.agent_id,
            agent_name: displayName(p.agent),
            avatar_url: p.agent.avatar_url,
            avatar_preset: p.agent.avatar_preset,
            activity_type: a.activity_type,
            points: a.points,
            premium: a.premium,
            created_at: a.created_at,
          });
        }
      });
    });
    out.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return out.slice(0, 8);
  }, [state]);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col overflow-hidden bg-background text-foreground">
      <TVHeader panel={panel} />

      <main className="flex flex-1 items-stretch overflow-hidden px-6 pb-4 sm:px-8 lg:px-12">
        {state ? (
          <div key={panel} className="tv-panel-enter flex w-full">
            {panel === "leaderboard" && (
              <LeaderboardPanel
                entries={state.leaderboard.entries}
                rankDeltas={rankDeltas}
              />
            )}
            {panel === "monthly_race" && (
              <HorseRacePanel
                entries={state.monthlyLeaderboard.entries}
                dailyPolicyGoal={managerSettings.dailyPolicyGoal}
              />
            )}
            {panel === "wins" && <WinsPanel wins={wins} />}
            {panel === "weekly_premium" && (
              <WeeklyPremiumPanel report={state.weeklyPremium} />
            )}
            {panel === "contests" && (
              <ContestsPanel
                contests={state.contests}
                standingsById={state.standingsById}
              />
            )}
            {panel === "team_goal" && (
              <TeamGoalPanel leaderboard={state.leaderboard} />
            )}
          </div>
        ) : error ? (
          <div className="m-auto max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-2xl font-semibold text-destructive">
              Couldn't load TV mode
            </p>
            <p className="mt-2 text-base text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="m-auto flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-2xl font-medium">Loading scoreboard…</p>
          </div>
        )}
      </main>

      <RotationFooter panel={panel} />
      {state && <TVOfficeGoal leaderboard={state.leaderboard} />}
      {state && <TVTicker profiles={state.profiles} />}
    </div>
  );
}

function RotationFooter({ panel }: { panel: TVPanelKey }) {
  return (
    <footer className="flex items-center justify-center border-t border-border/60 px-6 py-2 sm:px-8 lg:px-12">
      <div className="flex items-center gap-2">
        {PANELS.map((p) => (
          <span
            key={p}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              p === panel ? "bg-foreground" : "bg-muted-foreground/20",
            )}
          />
        ))}
      </div>
    </footer>
  );
}

function WinsPanel({ wins }: { wins: WinEntry[] }) {
  if (wins.length === 0) {
    return (
      <div className="m-auto text-3xl text-muted-foreground">
        No wins yet today — keep at it.
      </div>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-5 self-start">
      {wins.map((w) => (
        <div
          key={w.id}
          className="flex items-center gap-5 rounded-2xl border bg-card/40 px-6 py-5 backdrop-blur"
        >
          <Avatar
            name={w.agent_name}
            avatarUrl={w.avatar_url}
            avatarPreset={w.avatar_preset}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-semibold tracking-tight">
              {w.agent_name}
            </p>
            <p className="mt-1 text-lg text-muted-foreground">
              {ACTIVITY_LABEL[w.activity_type] ?? w.activity_type}
              {w.premium ? ` · $${w.premium.toLocaleString()}` : ""}
            </p>
          </div>
          <p className="font-mono text-4xl font-bold tabular-nums text-emerald-500">
            +{w.points}
          </p>
        </div>
      ))}
    </div>
  );
}

const CONTEST_RANK_TILE: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900",
  3: "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
};

function formatContestValue(value: number, metric: string): string {
  if (metric === "improved") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${Math.round(value)} pts`;
  }
  if (metric === "points") return `${Math.round(value)} pts`;
  return String(Math.round(value));
}

function ContestsPanel({
  contests,
  standingsById,
}: {
  contests: ContestListItem[];
  standingsById: Record<number, ContestStandings>;
}) {
  const today = localDateKey();
  // Active contests first (sorted by end_date), then pending, then ended.
  const sorted = [...contests].sort((a, b) => {
    const aActive = a.start_date <= today && a.end_date >= today ? 0 : 1;
    const bActive = b.start_date <= today && b.end_date >= today ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.end_date.localeCompare(b.end_date);
  });
  const visible = sorted.filter(
    (c) => c.start_date <= today && c.end_date >= today,
  );
  const display = visible.length > 0 ? visible : sorted.slice(0, 4);

  if (display.length === 0) {
    return (
      <div className="m-auto text-3xl text-muted-foreground">
        No contests running.
      </div>
    );
  }

  return (
    <div className="grid w-full auto-rows-min grid-cols-1 gap-5 self-start lg:grid-cols-2">
      {display.map((c) => {
        const active = c.start_date <= today && c.end_date >= today;
        const standings = standingsById[c.id];
        const top3 = standings?.entries.slice(0, 3) ?? [];
        const allZero =
          c.metric !== "improved" &&
          top3.length > 0 &&
          top3.every((e) => e.value === 0);

        return (
          <div
            key={c.id}
            className="flex flex-col gap-4 rounded-2xl border bg-card/40 px-7 py-6 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                  active
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {active ? "Live" : "Ended"}
              </span>
              <span className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Flame className="h-4 w-4" />
                {c.type} · {c.metric.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-3xl font-semibold tracking-tight">{c.name}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDateOnly(c.start_date, {
                month: "short",
                day: "numeric",
              })}
              {" → "}
              {formatDateOnly(c.end_date, {
                month: "short",
                day: "numeric",
              })}
            </p>

            <div className="mt-1 border-t border-border/60 pt-4">
              {!standings ? (
                <p className="text-base text-muted-foreground">Loading…</p>
              ) : allZero ? (
                <p className="text-base text-muted-foreground">
                  No {c.metric.replace(/_/g, " ")} logged yet — be the first.
                </p>
              ) : top3.length === 0 ? (
                <p className="text-base text-muted-foreground">
                  Standings will populate as activity rolls in.
                </p>
              ) : (
                <ol className="space-y-2">
                  {top3.map((e) => (
                    <li
                      key={e.agent_id}
                      className="flex items-center gap-3"
                    >
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold",
                          CONTEST_RANK_TILE[e.rank] ??
                            "border bg-muted/60 text-muted-foreground",
                        )}
                      >
                        {e.rank}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xl font-semibold">
                        {e.name}
                      </span>
                      <span className="font-mono text-2xl font-bold tabular-nums">
                        {formatContestValue(e.value, c.metric)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
