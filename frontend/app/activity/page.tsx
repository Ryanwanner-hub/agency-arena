import { ActivityClient } from "./ActivityClient";
import { api, type ActivityFeedItem, type Agent } from "@/lib/api";

export const metadata = { title: "Activity · Agency Arena" };

export default async function ActivityPage() {
  let items: ActivityFeedItem[] = [];
  let agents: Agent[] = [];
  let error: string | null = null;

  try {
    // Run feed + roster fetches in parallel — the modal needs the
    // active-only agent list for its dropdown.
    [items, agents] = await Promise.all([
      api<ActivityFeedItem[]>("/activity/feed?limit=500"),
      api<Agent[]>("/agents?active_only=true"),
    ]);
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

  return <ActivityClient items={items} agents={agents} />;
}
