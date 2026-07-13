import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state da trilha do curso (Suspense automático enquanto `getCourseDetailAction`
 * resolve). Server Component — apenas placeholders visuais.
 */
export default function CoursePageLoading() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-4 w-56" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-52 rounded-lg" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
