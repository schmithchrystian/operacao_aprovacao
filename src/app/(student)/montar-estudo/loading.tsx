import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state de "Montar estudo" (Suspense automático do App Router enquanto
 * `listCoursesAction`/`listSubjectOptionsAction` resolvem). Server Component — apenas
 * placeholders visuais.
 */
export default function MontarEstudoLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-[28rem] w-full rounded-xl" />
        <Skeleton className="h-[28rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
