import { notFound } from "next/navigation";

import { ApiErrorState } from "@/components/ui/api-error-state";
import {
  api,
  type Activity,
  type Agent,
  type AgentProfile,
} from "@/lib/api";
import { computeEarnedTitles } from "@/lib/titles";

import { PersonalizeForm } from "./PersonalizeForm";

export default async function AgentPersonalizePage({
  params,
}: {
  params: { id: string };
}) {
  const agentId = parseInt(params.id, 10);
  if (Number.isNaN(agentId)) notFound();

  let agent: Agent;
  let profile: AgentProfile;
  let activities: Activity[];

  try {
    [agent, profile, activities] = await Promise.all([
      api<Agent>(`/agents/${agentId}`),
      api<AgentProfile>(`/agents/${agentId}/profile?recent_count=100`),
      api<Activity[]>(`/agents/${agentId}/activity?limit=500`),
    ]);
  } catch (e) {
    return (
      <ApiErrorState
        message={e instanceof Error ? e.message : "Failed to load agent"}
      />
    );
  }

  const earned = computeEarnedTitles(profile, activities);

  return (
    <PersonalizeForm
      agent={agent}
      profile={profile}
      earnedTitles={Array.from(earned)}
    />
  );
}
