"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCelebrate } from "@/components/celebration/CelebrationProvider";
import { ActiveContestCard } from "@/components/dashboard/ActiveContestCard";
import { DetailPanel } from "@/components/dashboard/DetailPanel";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { RecentWinsFeed } from "@/components/dashboard/RecentWinsFeed";
import { RecommendedActionsCard } from "@/components/dashboard/RecommendedActionsCard";
import { TopStrip } from "@/components/dashboard/TopStrip";
import { useSound } from "@/components/sound/SoundProvider";
import { subscribeAgentUpdated } from "@/lib/agent-events";
import {
  api,
  type Agent,
  type AgentProfile,
  type ContestListItem,
  type LeaderboardResponse,
} from "@/lib/api";
import { computeStatus, computeStreak } from "@/lib/status";

export function DashboardClient({
  leaderboard: initialLeaderboard,
  profiles: initialProfiles,
  contests,
}: {
  leaderboard: LeaderboardResponse;
  profiles: AgentProfile[];
  contests: ContestListItem[];
}) {
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardResponse>(initialLeaderboard);
  const [profiles, setProfiles] = useState<AgentProfile[]>(initialProfiles);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const profilesById = useMemo(
    () => new Map(profiles.map((p) => [p.agent.id, p])),
    [profiles],
  );

  const selectedProfile =
    selectedId !== null ? profilesById.get(selectedId) ?? null : null;
  const selectedEntry = useMemo(() => {
    if (selectedId === null) return null;
    return (
      leaderboard.entries.find((e) => e.agent_id === selectedId) ?? null
    );
  }, [leaderboard, selectedId]);

  const selectedStatus = useMemo(() => {
    if (!selectedProfile || !selectedEntry) return undefined;
    return computeStatus({
      rank: selectedEntry.rank,
      pointsToday: selectedEntry.total_points,
      streak: computeStreak(selectedProfile.daily_history),
      trendPct: selectedEntry.trend_pct,
      trendDelta: selectedEntry.trend_delta,
    });
  }, [selectedProfile, selectedEntry]);

  const sound = useSound();
  const celebrate = useCelebrate();
  const topAgentIdRef = useRef<number | null>(
    initialLeaderboard.entries[0]?.agent_id ?? null,
  );
  const top3IdsRef = useRef<Set<number>>(
    new Set(
      initialLeaderboard.entries
        .filter((e) => e.rank <= 3)
        .map((e) => e.agent_id),
    ),
  );
  const prevRanksRef = useRef<Record<number, number>>(
    Object.fromEntries(
      initialLeaderboard.entries.map((e) => [e.agent_id, e.rank]),
    ),
  );
  const [rankDeltas, setRankDeltas] = useState<Record<number, number>>({});
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const next = await api<LeaderboardResponse>(
          "/leaderboard?period=daily",
        );
        const newTopId = next.entries[0]?.agent_id ?? null;
        const top1Flipped =
          newTopId !== null && newTopId !== topAgentIdRef.current;

        const nextTop3 = new Set(
          next.entries.filter((e) => e.rank <= 3).map((e) => e.agent_id),
        );
        const newcomers = next.entries
          .filter((e) => e.rank <= 3 && !top3IdsRef.current.has(e.agent_id))
          .slice(0, 1);

        // Per-agent rank movement vs the prior snapshot. Positive =
        // climbed (e.g. was 3, now 1 → +2).
        const nextRanks: Record<number, number> = {};
        const deltas: Record<number, number> = {};
        next.entries.forEach((e) => {
          nextRanks[e.agent_id] = e.rank;
          const prev = prevRanksRef.current[e.agent_id];
          if (prev !== undefined && prev !== e.rank) {
            deltas[e.agent_id] = prev - e.rank;
          }
        });
        prevRanksRef.current = nextRanks;

        if (Object.keys(deltas).length > 0) {
          setRankDeltas(deltas);
          if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
          // Clear movement chips a bit before the next refresh so they
          // visibly fade between polls.
          deltaTimeoutRef.current = setTimeout(
            () => setRankDeltas({}),
            13_000,
          );
        }

        // Refresh the leaderboard whenever anything changed (rank order,
        // top-3 entry, or any agent's rank shifted) so trend chips and
        // momentum statuses stay in sync with the latest data.
        const anyMovement = Object.keys(deltas).length > 0;
        if (top1Flipped || newcomers.length > 0 || anyMovement) {
          topAgentIdRef.current = newTopId;
          top3IdsRef.current = nextTop3;
          setLeaderboard(next);
        }

        if (newcomers.length > 0) {
          const e = newcomers[0];
          celebrate({
            type: "rank_change",
            tier: "large",
            title: `${e.name} hit the podium`,
            description: `Now #${e.rank} on today's board.`,
          });
        } else if (top1Flipped) {
          sound.play("leaderboard_change");
        }
      } catch {
        // ignore transient fetch failures
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [sound, celebrate]);

  useEffect(
    () => () => {
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
    },
    [],
  );

  const handleAgentUpdated = useCallback((updated: Agent) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.agent.id === updated.id ? { ...p, agent: updated } : p,
      ),
    );
    setLeaderboard((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.agent_id === updated.id
          ? {
              ...e,
              name: updated.name,
              nickname: updated.nickname,
              avatar_url: updated.avatar_url,
              avatar_preset: updated.avatar_preset,
            }
          : e,
      ),
    }));
  }, []);

  useEffect(() => {
    return subscribeAgentUpdated(handleAgentUpdated);
  }, [handleAgentUpdated]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Today's leaderboard ·{" "}
          {new Date(leaderboard.start_date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <TopStrip leaderboard={leaderboard} />

      {/* Two-column layout: leaderboard takes 2/3 on desktop, right rail
          stacks below on smaller widths. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <LeaderboardTable
            leaderboard={leaderboard}
            profiles={profilesById}
            selectedId={selectedId}
            onRowClick={setSelectedId}
            rankDeltas={rankDeltas}
          />
        </div>

        <aside className="space-y-6">
          <RecentWinsFeed profiles={profiles} />
          <RecommendedActionsCard
            leaderboard={leaderboard}
            profiles={profiles}
          />
          <ActiveContestCard contests={contests} />
        </aside>
      </div>

      <DetailPanel
        profile={selectedProfile}
        rank={selectedEntry?.rank}
        status={selectedStatus}
        onClose={() => setSelectedId(null)}
        onAgentUpdated={handleAgentUpdated}
      />
    </div>
  );
}
