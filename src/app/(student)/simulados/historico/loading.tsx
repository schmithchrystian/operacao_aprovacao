import { Skeleton } from "@/components/ui/skeleton";

/** Loading state do histórico de simulados. Server Component — apenas placeholders visuais. */
export default function SimuladosHistoricoLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-8 w-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
