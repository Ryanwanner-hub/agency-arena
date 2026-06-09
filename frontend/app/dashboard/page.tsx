import { DashboardClient } from "./DashboardClient";
import { ApiErrorState } from "@/components/ui/api-error-state";
import {
  api,
  type AgentProfile,
  type ContestListItem,
  type LeaderboardResponse,
} from "@/lib/api";

export default async function DashboardPage() {
  let leaderboard: LeaderboardResponse | null = null;
  let profiles: AgentProfile[] = [];
  let contests: ContestListItem[] = [];
  let error: string | null = null;

  try {
    leaderboard = await api<LeaderboardResponse>("/leaderboard?period=daily");
    [profiles, contests] = await Promise.all([
      Promise.all(
        leaderboard.entries.map((e) =>
          api<AgentProfile>(`/agents/${e.agent_id}/profile?recent_count=100`),
        ),
      ),
      api<ContestListItem[]>("/contests"),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboard";
  }

  if (error || !leaderboard) {
    return <ApiErrorState message={error ?? "Failed to load dashboard"} />;
  }

  return (
    <DashboardClient
      leaderboard={leaderboard}
      profiles={profiles}
      contests={contests}
    />
  );
}
