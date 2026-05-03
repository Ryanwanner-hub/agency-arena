"use client";

import { ChevronRight, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  displayName,
  type Agent,
  type AgentProfile,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function AgentsClient({
  agents,
  profiles,
}: {
  agents: Agent[];
  profiles: AgentProfile[];
}) {
  const profileById = useMemo(
    () => new Map(profiles.map((p) => [p.agent.id, p])),
    [profiles],
  );

  const [query, setQuery] = useState("");

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            {totalActive} active · click any agent to personalize their avatar
            and titles.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents…"
            className="rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState hasAgents={agents.length > 0} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentTile
              key={agent.id}
              agent={agent}
              profile={profileById.get(agent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentTile({
  agent,
  profile,
}: {
  agent: Agent;
  profile: AgentProfile | undefined;
}) {
  const lifetime = profile?.lifetime;

  return (
    <Link
      href={`/agents/${agent.id}/personalize`}
      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Card
        className={cn(
          "h-full transition-all hover:-translate-y-0.5 hover:shadow-md",
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
                <span className="mt-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
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
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ hasAgents }: { hasAgents: boolean }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-8 py-16 text-center">
      <UserPlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
      <p className="font-medium">
        {hasAgents ? "No matches" : "No agents yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAgents
          ? "Try a different search term."
          : "Add an agent from the API or seed script to populate the roster."}
      </p>
    </div>
  );
}
