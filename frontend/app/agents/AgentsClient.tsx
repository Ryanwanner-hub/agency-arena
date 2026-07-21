"use client";

import { ChevronRight, Eye, EyeOff, Plus, Search, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CreateAgentModal } from "@/components/agents/CreateAgentModal";
import { Avatar } from "@/components/avatar/Avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  api,
  displayName,
  type Agent,
  type AgentProfile,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function AgentsClient({
  agents: initialAgents,
  profiles,
}: {
  agents: Agent[];
  profiles: AgentProfile[];
}) {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const profileById = useMemo(
    () => new Map(profiles.map((p) => [p.agent.id, p])),
    [profiles],
  );

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function toggleActive(agent: Agent) {
    const next = !agent.active;
    setTogglingId(agent.id);
    // Optimistically flip so the dim + "Inactive" badge update instantly.
    // Deactivating drops them from the leaderboard, contests, and TV (all
    // filter active server-side) without touching their history.
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, active: next } : a)),
    );
    try {
      await api(`/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: next }),
      });
      router.refresh();
    } catch {
      // Revert on failure — the snap-back signals it didn't take.
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, active: !next } : a)),
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api(`/agents/${deleteTarget.id}`, { method: "DELETE" });
      // Drop from the local grid immediately; router.refresh re-pulls the
      // server-rendered profiles/stats for everyone else.
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => {
      const name = displayName(a).toLowerCase();
      const role = a.role.toLowerCase();
      const title = (a.title ?? "").toLowerCase();
      return name.includes(q) || role.includes(q) || title.includes(q);
    });
  }, [agents, query]);

  const totalActive = agents.filter((a) => a.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        subtitle={`${totalActive} active · click any agent to personalize their avatar and titles.`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search agents…"
                className="rounded-lg border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              Add agent
            </Button>
          </>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          hasAgents={agents.length > 0}
          onAdd={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentTile
              key={agent.id}
              agent={agent}
              profile={profileById.get(agent.id)}
              onDelete={setDeleteTarget}
              onToggleActive={toggleActive}
              toggling={togglingId === agent.id}
            />
          ))}
        </div>
      )}

      {creating && (
        <CreateAgentModal
          onClose={() => setCreating(false)}
          onCreated={(agent) => {
            // Optimistically add the new agent so the grid updates
            // immediately; the next dashboard poll picks up real stats.
            setAgents((prev) => [...prev, agent]);
            setCreating(false);
            // Refresh server-rendered profile data on next nav.
            router.refresh();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteAgentDialog
          agent={deleteTarget}
          deleting={deleting}
          error={deleteError}
          onConfirm={handleDelete}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}

function AgentTile({
  agent,
  profile,
  onDelete,
  onToggleActive,
  toggling,
}: {
  agent: Agent;
  profile: AgentProfile | undefined;
  onDelete: (agent: Agent) => void;
  onToggleActive: (agent: Agent) => void;
  toggling: boolean;
}) {
  const lifetime = profile?.lifetime;
  const ActiveIcon = agent.active ? EyeOff : Eye;

  return (
    <div className="group relative">
      <Link
        href={`/agents/${agent.id}/personalize`}
        className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Card
          className={cn(
            "card-interactive h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
            !agent.active && "opacity-60",
          )}
        >
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <Avatar
                name={displayName(agent)}
                avatarUrl={agent.avatar_url}
                avatarPreset={agent.avatar_preset}
                backgroundColor={agent.avatar_color}
                frame={agent.avatar_frame as never}
                status={agent.status_effect as never}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{displayName(agent)}</p>
                <p className="text-xs text-muted-foreground">
                  {agent.role.replace(/_/g, " ")}
                  {agent.title ? ` · ${agent.title}` : ""}
                </p>
                {!agent.active && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-border">
                    Inactive
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:opacity-0" />
            </div>

            {lifetime ? (
              <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                <Stat label="Points" value={lifetime.total_points} />
                <Stat label="Policies" value={lifetime.policies} />
                <Stat
                  label="Close rate"
                  value={
                    lifetime.quotes > 0
                      ? `${Math.round(lifetime.close_rate * 100)}%`
                      : "—"
                  }
                />
              </div>
            ) : (
              <div className="border-t pt-3 text-center text-xs text-muted-foreground">
                No stats yet
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Actions sit outside the Link (siblings, layered on top) so clicking
          them never triggers navigation. They reveal on hover/focus, swapping
          in where the chevron fades out. */}
      <div className="absolute right-3 top-4 z-10 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onToggleActive(agent)}
          disabled={toggling}
          aria-label={
            agent.active
              ? `Deactivate ${displayName(agent)}`
              : `Reactivate ${displayName(agent)}`
          }
          title={
            agent.active
              ? "Deactivate — hide from leaderboard, contests & TV (keeps history)"
              : "Reactivate — show on the boards again"
          }
          className="rounded-md bg-card/80 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
        >
          <ActiveIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(agent)}
          aria-label={`Delete ${displayName(agent)}`}
          title="Delete agent"
          className="rounded-md bg-card/80 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="stat-number text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function EmptyState({
  hasAgents,
  onAdd,
}: {
  hasAgents: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-8 py-16 text-center">
      <UserPlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="font-medium">
        {hasAgents ? "No matches" : "No agents yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAgents
          ? "Try a different search term."
          : "Add your first team member to start the leaderboard."}
      </p>
      {!hasAgents && (
        <Button type="button" onClick={onAdd} className="mt-4">
          <Plus className="h-4 w-4" />
          Add your first agent
        </Button>
      )}
    </div>
  );
}

function DeleteAgentDialog({
  agent,
  deleting,
  error,
  onConfirm,
  onCancel,
}: {
  agent: Agent;
  deleting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Close on Esc (unless a delete is mid-flight).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Delete ${displayName(agent)}`}
      >
        <div className="flex items-start gap-3 border-b px-6 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Delete {displayName(agent)}?
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This permanently removes the agent along with all their logged
              activity, daily scores, and badges. This can&apos;t be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 border-t bg-muted/20 px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete agent"}
          </Button>
        </footer>
      </div>
    </>
  );
}
