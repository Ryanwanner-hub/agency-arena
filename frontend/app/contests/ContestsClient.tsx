"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ContestCard } from "@/components/contests/ContestCard";
import { CreateContestModal } from "@/components/contests/CreateContestModal";
import { StandingsPanel } from "@/components/contests/StandingsPanel";
import { cn } from "@/lib/utils";
import { api, type ContestListItem, type ContestStatus } from "@/lib/api";

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

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contests</h1>
          <p className="text-sm text-muted-foreground">
            Active and past sales challenges. Click any contest to see standings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New contest
        </button>
      </header>

      <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
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
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-xs text-muted-foreground">
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
