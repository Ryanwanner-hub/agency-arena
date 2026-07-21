"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { ContestCard } from "@/components/contests/ContestCard";
import { CreateContestModal } from "@/components/contests/CreateContestModal";
import { StandingsPanel } from "@/components/contests/StandingsPanel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { api, type ContestListItem, type ContestStatus } from "@/lib/api";

/** How often to refetch the contest list while the page is open. Picks
 * up new leaders + status flips (pending → active → ended) without a
 * manual refresh. 20 s is a comfortable cadence for monthly windows. */
const POLL_MS = 20_000;

type Filter = "all" | ContestStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Upcoming" },
  { value: "ended", label: "Ended" },
];

export function ContestsClient({
  initialContests,
}: {
  initialContests: ContestListItem[];
}) {
  const [contests, setContests] = useState(initialContests);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const visible =
    filter === "all"
      ? contests
      : contests.filter((c) => c.status === filter);

  const editingContest =
    editingId !== null ? contests.find((c) => c.id === editingId) ?? null : null;

  async function refresh() {
    const next = await api<ContestListItem[]>("/contests");
    setContests(next);
  }

  // Live-poll the contest list while the page is open. Fold in new
  // leaders + auto-status flips without forcing the manager to refresh.
  // Bails on tab visibility = hidden so the user's idle tab stops
  // hammering the API.
  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      if (typeof document !== "undefined" && document.hidden) return;
      inFlight = true;
      try {
        const next = await api<ContestListItem[]>("/contests");
        if (!cancelled) setContests(next);
      } catch {
        // ignore transient fetch failures — next tick retries
      } finally {
        inFlight = false;
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contests"
        subtitle="Active and past sales challenges. Click any contest to see standings."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New contest
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? contests.length
              : contests.filter((c) => c.status === f.value).length;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "ml-1.5 text-xs",
                  active
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-8 py-16 text-center">
          <p className="text-sm font-medium">No contests in this view</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different filter or create a new contest.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <ContestCard
              key={c.id}
              contest={c}
              selected={selectedId === c.id}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>
      )}

      <StandingsPanel
        contestId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => {
          setSelectedId(null);
          setEditingId(id);
        }}
        onDeleted={async (id) => {
          setSelectedId(null);
          // Optimistic remove so the panel closes cleanly without waiting.
          setContests((prev) => prev.filter((c) => c.id !== id));
          await refresh();
        }}
      />

      {creating && (
        <CreateContestModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await refresh();
          }}
        />
      )}

      {editingContest && (
        <CreateContestModal
          editing={editingContest}
          onClose={() => setEditingId(null)}
          onCreated={async () => {
            setEditingId(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
