import { ActivityClient } from "./ActivityClient";
import { api, type ActivityFeedItem } from "@/lib/api";

export const metadata = { title: "Activity · Agency Arena" };

export default async function ActivityPage() {
  let items: ActivityFeedItem[] = [];
  let error: string | null = null;

  try {
    items = await api<ActivityFeedItem[]>("/activity/feed?limit=500");
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

  return <ActivityClient items={items} />;
}
