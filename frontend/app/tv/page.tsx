"use client";

import { Award, Calendar, Flame } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { LeaderboardPanel } from "@/components/tv/LeaderboardPanel";
import { TeamGoalPanel } from "@/components/tv/TeamGoalPanel";
import { TVHeader, type TVPanelKey } from "@/components/tv/TVHeader";
import { TVOfficeGoal } from "@/components/tv/TVOfficeGoal";
import { TVTicker } from "@/components/tv/TVTicker";
import {
  api,
  displayName,
  type AgentProfile,
  type Contest,
  type EarnedBadge,
  type LeaderboardResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const PANELS: TVPanelKey[] = [
  "leaderboard",
  "wins",
  "badges",
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

type AwardEntry = {
  id: number;
  agent_id: number;
  agent_name: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  badge: EarnedBadge;
};

type State = {
  leaderboard: LeaderboardResponse;
  profiles: AgentProfile[];
  contests: Contest[];
};

async function fetchAll(): Promise<State> {
  const leaderboard = await api<LeaderboardResponse>(
    "/leaderboard?period=daily",
  );
  const [profiles, contests] = await Promise.all([
    Promise.all(
      leaderboard.entries.map((e) =>
        api<AgentProfile>(`/agents/${e.agent_id}/profile`),
      ),
    ),
    api<Contest[]>("/contests"),
  ]);
  return { leaderboard, profiles, contests };
}

export default function TVPage() {
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
    async function load() {
      try {
        const data = await fetchAll();
        if (cancelled) return;
        setState(data);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load");
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

  const awards = useMemo<AwardEntry[]>(() => {
    if (!state) return [];
    const out: AwardEntry[] = [];
    state.profiles.forEach((p) => {
      p.badges.forEach((b) => {
        out.push({
          id: b.id,
          agent_id: p.agent.id,
          agent_name: displayName(p.agent),
          avatar_url: p.agent.avatar_url,
          avatar_preset: p.agent.avatar_preset,
          badge: b,
        });
      });
    });
    out.sort((a, b) => b.badge.earned_at.localeCompare(a.badge.earned_at));
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
            {panel === "wins" && <WinsPanel wins={wins} />}
            {panel === "badges" && <BadgesPanel awards={awards} />}
            {panel === "contests" && (
              <ContestsPanel contests={state.contests} />
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
    <footer className="flex items-center justify-between border-t border-border/60 px-6 py-3 text-sm text-muted-foreground sm:px-8 lg:px-12">
      <span>Auto-refreshing every 10 seconds · panel rotates every 15</span>
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

const BADGE_GRADIENT: Record<string, string> = {
  "First Sale": "from-amber-400 to-orange-500",
  "Quote Machine": "from-blue-400 to-indigo-500",
  "Streak Starter": "from-orange-400 to-rose-500",
  "Top Closer": "from-emerald-400 to-teal-500",
  "Referral Champ": "from-violet-400 to-purple-500",
};

function BadgesPanel({ awards }: { awards: AwardEntry[] }) {
  if (awards.length === 0) {
    return (
      <div className="m-auto text-3xl text-muted-foreground">
        No badges yet — first one's on its way.
      </div>
    );
  }
  return (
    <div className="grid w-full grid-cols-2 gap-5 self-start">
      {awards.map((a) => (
        <div
          key={`${a.agent_id}-${a.id}`}
          className="flex items-center gap-5 rounded-2xl border bg-card/40 px-6 py-5 backdrop-blur"
        >
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
              BADGE_GRADIENT[a.badge.name] ?? "from-zinc-400 to-zinc-600",
            )}
          >
            <Award className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-semibold tracking-tight">
              {a.badge.name}
            </p>
            <p className="mt-1 text-lg text-muted-foreground">
              <span className="text-foreground">{a.agent_name}</span>
              {" · "}
              {new Date(a.badge.earned_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContestsPanel({ contests }: { contests: Contest[] }) {
  const sorted = [...contests].sort((a, b) =>
    a.end_date.localeCompare(b.end_date),
  );
  if (sorted.length === 0) {
    return (
      <div className="m-auto text-3xl text-muted-foreground">
        No contests running.
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid w-full grid-cols-1 gap-5 self-start lg:grid-cols-2">
      {sorted.map((c) => {
        const active = c.start_date <= today && c.end_date >= today;
        return (
          <div
            key={c.id}
            className="flex flex-col gap-3 rounded-2xl border bg-card/40 px-7 py-6 backdrop-blur"
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
            <p className="text-4xl font-semibold tracking-tight">{c.name}</p>
            <p className="flex items-center gap-2 text-lg text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(c.start_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              {" → "}
              {new Date(c.end_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
