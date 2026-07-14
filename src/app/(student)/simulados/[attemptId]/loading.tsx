import { Skeleton } from "@/components/ui/skeleton";

/** Loading state da resolução do simulado. Server Component — apenas placeholders visuais. */
export default function AttemptLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Skeleton className="h-96 w-full rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
