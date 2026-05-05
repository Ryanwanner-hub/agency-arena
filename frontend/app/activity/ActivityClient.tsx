"use client";

import { Activity as ActivityIcon, Filter, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { LogActivityModal } from "@/components/activity/LogActivityModal";
import { Avatar } from "@/components/avatar/Avatar";
import { useManagerSettings } from "@/components/settings/ManagerSettingsProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  api,
  type ActivityFeedItem,
  type Agent,
  displayName,
} from "@/lib/api";
import { localDateKey } from "@/lib/dates";
import { ACTIVITY_LABEL } from "@/lib/manager-settings";
import { cn } from "@/lib/utils";

type Filter = "all" | "wins" | "quotes" | "referrals";

const WIN_TYPES = new Set([
  "policy_bound",
  "multi_policy_bonus",
  "referral_converted",
  "cross_sell_sold",
  "review_received",
]);
const QUOTE_TYPES = new Set(["quote_started", "quote_completed"]);
const REFERRAL_TYPES = new Set(["referral_received", "referral_converted"]);

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "wins", label: "Wins" },
  { key: "quotes", label: "Quotes" },
  { key: "referrals", label: "Referrals" },
];

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const todayKey = localDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === todayKey) return "Today";
  if (iso === localDateKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ActivityClient({
  items,
  agents,
}: {
  items: ActivityFeedItem[];
  agents: Agent[];
}) {
  const router = useRouter();
  const { settings } = useManagerSettings();
  const showPremium = settings.display.showPremium;

  const [filter, setFilter] = useState<Filter>("all");
  const [agentId, setAgentId] = useState<number | "all">("all");
  const [logging, setLogging] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function deleteActivity(id: number) {
    setDeletingId(id);
    try {
      await api(`/activity/${id}`, { method: "DELETE" });
      setPendingDeleteId(null);
      router.refresh();
    } catch {
      // surface failure inline by simply leaving confirm visible
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (agentId !== "all" && it.agent.id !== agentId) return false;
      if (filter === "all") return true;
      if (filter === "wins") return WIN_TYPES.has(it.activity_type);
      if (filter === "quotes") return QUOTE_TYPES.has(it.activity_type);
      if (filter === "referrals") return REFERRAL_TYPES.has(it.activity_type);
      return true;
    });
  }, [items, filter, agentId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityFeedItem[]>();
    for (const it of filtered) {
      const key = dayKey(it.created_at);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Counts for the filter chips so the user sees what they're hiding.
  const counts = useMemo(() => {
    const scoped = items.filter(
      (it) => agentId === "all" || it.agent.id === agentId,
    );
    return {
      all: scoped.length,
      wins: scoped.filter((it) => WIN_TYPES.has(it.activity_type)).length,
      quotes: scoped.filter((it) => QUOTE_TYPES.has(it.activity_type)).length,
      referrals: scoped.filter((it) => REFERRAL_TYPES.has(it.activity_type))
        .length,
    } as Record<Filter, number>;
  }, [items, agentId]);

  const totalPoints = filtered.reduce((sum, it) => sum + it.points, 0);
  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      ),
    [agents],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Recent team activity across the office.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLogging(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Log activity
        </button>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              Live feed
            </CardTitle>
            <span className="font-mono text-xs text-muted-foreground">
              {filtered.length} events · {totalPoints} pts
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-mono",
                      active ? "bg-primary/15" : "bg-muted",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <label
                htmlFor="agent-filter"
                className="text-xs text-muted-foreground"
              >
                Agent
              </label>
              <select
                id="agent-filter"
                value={agentId}
                onChange={(e) =>
                  setAgentId(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  )
                }
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value="all">All agents</option>
                {sortedAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {displayName(a)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {grouped.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              {grouped.map(([day, dayItems]) => (
                <section key={day}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {formatDay(day)}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {dayItems.length}
                    </span>
                  </div>
                  <ul className="overflow-hidden rounded-md border bg-card">
                    {dayItems.map((it, i) => {
                      const pending = pendingDeleteId === it.id;
                      const deleting = deletingId === it.id;
                      return (
                        <li
                          key={`${it.agent.id}-${it.id}`}
                          className={cn(
                            "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                            i > 0 && "border-t",
                            pending && "bg-destructive/5",
                          )}
                        >
                          <Avatar
                            name={displayName(it.agent)}
                            avatarUrl={it.agent.avatar_url}
                            avatarPreset={it.agent.avatar_preset}
                            backgroundColor={it.agent.avatar_color}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {displayName(it.agent)}
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                {ACTIVITY_LABEL[
                                  it.activity_type as keyof typeof ACTIVITY_LABEL
                                ] ?? it.activity_type}
                              </span>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {showPremium && it.premium
                                ? `$${it.premium.toLocaleString()} · `
                                : ""}
                              {it.source ? `${it.source.replace(/_/g, " ")} · ` : ""}
                              {relativeTime(it.created_at)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 font-mono text-sm font-semibold tabular-nums",
                              it.points > 0
                                ? "text-emerald-600"
                                : "text-muted-foreground",
                            )}
                          >
                            +{it.points}
                          </span>
                          {pending ? (
                            <span className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => deleteActivity(it.id)}
                                disabled={deleting}
                                className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                              >
                                {deleting ? "Deleting…" : "Confirm"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(null)}
                                disabled={deleting}
                                className="rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(it.id)}
                              className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                              aria-label="Delete activity"
                              title="Delete activity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {logging && (
        <LogActivityModal
          agents={agents}
          onClose={() => setLogging(false)}
          onLogged={() => {
            setLogging(false);
            // Re-fetch the feed (server component) so the new event shows
            // up immediately. Dashboard + contests pick it up on their
            // next poll.
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
      <ActivityIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm font-medium">No activity in this window.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Try widening the filter or selecting a different agent.
      </p>
    </div>
  );
}
