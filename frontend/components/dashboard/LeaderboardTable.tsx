"use client";

import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentProfile, LeaderboardResponse } from "@/lib/api";

import { LeaderboardRow } from "./LeaderboardRow";

export function LeaderboardTable({
  leaderboard,
  profiles,
  selectedId,
  onRowClick,
  rankDeltas,
}: {
  leaderboard: LeaderboardResponse;
  profiles: Map<number, AgentProfile>;
  selectedId: number | null;
  onRowClick: (agentId: number) => void;
  /** Per-agent rank movement since the previous poll. Positive = moved up. */
  rankDeltas?: Record<number, number>;
}) {
  const { settings } = useManagerSettings();
  const { showCloseRate, showRankMovement } = settings.display;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display">Leaderboard</CardTitle>
        <span className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="live-dot" aria-hidden />
          Live
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Rank</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Agent</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Points</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Quotes</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Policies</th>
                {showCloseRate && (
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Close Rate
                  </th>
                )}
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Streak</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.entries.map((entry) => (
                <LeaderboardRow
                  key={entry.agent_id}
                  entry={entry}
                  profile={profiles.get(entry.agent_id)}
                  selected={selectedId === entry.agent_id}
                  onClick={() => onRowClick(entry.agent_id)}
                  rankDelta={
                    showRankMovement ? rankDeltas?.[entry.agent_id] : undefined
                  }
                  showCloseRate={showCloseRate}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Click any row to see activity, badges, and trends.
        </div>
      </CardContent>
    </Card>
  );
}
