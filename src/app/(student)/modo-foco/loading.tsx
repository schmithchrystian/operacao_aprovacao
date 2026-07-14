import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state de "Modo foco" (Suspense automático do App Router enquanto
 * `listSubjectOptionsAction` resolve). Server Component — apenas placeholders visuais.
 */
export default function ModoFocoLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-[26rem] w-full rounded-xl" />
    </div>
  );
}
