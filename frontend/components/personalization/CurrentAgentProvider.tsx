"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { API_BASE, type Agent } from "@/lib/api";
import { emitAgentUpdated, subscribeAgentUpdated } from "@/lib/agent-events";

type Ctx = {
  agent: Agent;
  /** Patch the current user's agent record. Updates state and broadcasts so
   * other surfaces (leaderboard rows, top bar) refresh instantly. */
  updateAgent: (patch: Partial<Agent>) => Promise<Agent>;
  /** Switch to a different agent as "the current user". */
  switchTo: (agent: Agent) => void;
};

const CurrentAgentContext = createContext<Ctx | null>(null);

export function CurrentAgentProvider({
  initialAgent,
  children,
}: {
  initialAgent: Agent;
  children: React.ReactNode;
}) {
  const [agent, setAgent] = useState<Agent>(initialAgent);

  // If something else updates *our* agent (e.g. avatar picker on dashboard),
  // mirror it into the provider so the topbar avatar refreshes.
  useEffect(() => {
    return subscribeAgentUpdated((updated) => {
      if (updated.id === agent.id) setAgent(updated);
    });
  }, [agent.id]);

  const updateAgent = useCallback(
    async (patch: Partial<Agent>): Promise<Agent> => {
      const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API ${res.status}: ${body || res.statusText}`);
      }
      const updated = (await res.json()) as Agent;
      setAgent(updated);
      emitAgentUpdated(updated);
      return updated;
    },
    [agent.id],
  );

  const switchTo = useCallback((next: Agent) => {
    setAgent(next);
    fetch(`${API_BASE}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_agent_id: next.id }),
    }).catch(() => {
      // Non-fatal — local state is correct, persisted choice will sync next reload
    });
  }, []);

  return (
    <CurrentAgentContext.Provider value={{ agent, updateAgent, switchTo }}>
      {children}
    </CurrentAgentContext.Provider>
  );
}

export function useCurrentAgent(): Ctx {
  const ctx = useContext(CurrentAgentContext);
  if (!ctx)
    throw new Error(
      "useCurrentAgent must be used inside <CurrentAgentProvider>",
    );
  return ctx;
}
