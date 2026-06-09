import { ContestsClient } from "./ContestsClient";
import { ApiErrorState } from "@/components/ui/api-error-state";
import { api, type ContestListItem } from "@/lib/api";

export default async function ContestsPage() {
  let contests: ContestListItem[] = [];
  let error: string | null = null;
  try {
    contests = await api<ContestListItem[]>("/contests");
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load contests";
  }

  if (error) {
    return <ApiErrorState message={error} />;
  }

  return <ContestsClient initialContests={contests} />;
}
