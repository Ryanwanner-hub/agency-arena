import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </header>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[420px]" />
    </div>
  );
}
