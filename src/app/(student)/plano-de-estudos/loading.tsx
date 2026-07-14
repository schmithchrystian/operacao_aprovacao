import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state de "Plano de estudos" (Suspense automático do App Router enquanto
 * `getPlanAction`/`listSubjectOptionsAction` resolvem). Server Component — apenas placeholders
 * visuais.
 */
export default function PlanoDeEstudosLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
