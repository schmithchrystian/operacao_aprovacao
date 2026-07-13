import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state do catálogo de cursos (Suspense automático do App Router enquanto
 * `listCoursesAction` resolve). Server Component — apenas placeholders visuais.
 */
export default function CursosLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
