import { ActivityClient } from "./ActivityClient";
import { api, type AgentProfile, type LeaderboardResponse } from "@/lib/api";

export const metadata = { title: "Activity · Agency Arena" };

export default async function ActivityPage() {
  let profiles: AgentProfile[] = [];
  let error: string | null = null;

  try {
    // Reuse the dashboard's data shape so the activity feed sees the same
    // recent windows. Profiles include ``recent_activity`` per agent — we
    // flatten + sort client-side.
    const lb = await api<LeaderboardResponse>("/leaderboard?period=daily");
    profiles = await Promise.all(
      lb.entries.map((e) =>
        api<AgentProfile>(`/agents/${e.agent_id}/profile`),
      ),
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load activity";
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return <ActivityClient profiles={profiles} />;
}
