import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state de "Brainstorm" (Suspense automático do App Router enquanto
 * `listBoardsAction`/`getBoardAction`/`listSubjectOptionsAction` resolvem). Server Component —
 * apenas placeholders visuais (5 "colunas" como no quadro real).
 */
export default function BrainstormLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-8 w-64 rounded-lg" />
      <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
