import { ContestsClient } from "./ContestsClient";
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
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  return <ContestsClient initialContests={contests} />;
}
