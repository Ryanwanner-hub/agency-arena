import { cn } from "@/lib/utils";

/** Plain animated placeholder block. Composed by route-level
 * ``loading.tsx`` files so each page picks the right shape. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}
