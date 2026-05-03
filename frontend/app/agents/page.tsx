import { AgentsClient } from "./AgentsClient";
import { api, type Agent, type AgentProfile } from "@/lib/api";

export const metadata = { title: "Agents · Agency Arena" };

export default async function AgentsPage() {
  let agents: Agent[] = [];
  let profiles: AgentProfile[] = [];
  let error: string | null = null;

  try {
    agents = await api<Agent[]>("/agents");
    profiles = await Promise.all(
      agents.map((a) => api<AgentProfile>(`/agents/${a.id}/profile`)),
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load agents";
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return <AgentsClient agents={agents} profiles={profiles} />;
}
