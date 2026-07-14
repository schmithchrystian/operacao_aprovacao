import { Skeleton } from "@/components/ui/skeleton";

/** Loading state da sessão de revisão (Suspense automático enquanto `getReviewSessionAction`
 *  resolve). Server Component — apenas placeholders visuais. */
export default function RevisarFlashcardsLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-3 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
