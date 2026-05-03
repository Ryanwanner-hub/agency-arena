import type { Agent } from "./api";

type AgentUpdateListener = (agent: Agent) => void;

const listeners = new Set<AgentUpdateListener>();

/** Broadcast that an agent's record changed (avatar, nickname, etc.).
 * Anyone subscribed re-renders against the new shape — no router refresh,
 * no prop drilling. */
export function emitAgentUpdated(agent: Agent): void {
  listeners.forEach((l) => {
    try {
      l(agent);
    } catch {
      // listeners shouldn't kill each other
    }
  });
}

export function subscribeAgentUpdated(
  listener: AgentUpdateListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
