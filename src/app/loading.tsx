import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageSkeleton />
    </div>
  );
}
