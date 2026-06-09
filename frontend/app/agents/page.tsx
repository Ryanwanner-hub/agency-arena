import { AgentsClient } from "./AgentsClient";
import { ApiErrorState } from "@/components/ui/api-error-state";
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
    return <ApiErrorState message={error} />;
  }

  return <AgentsClient agents={agents} profiles={profiles} />;
}
