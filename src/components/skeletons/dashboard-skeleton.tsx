import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="pb-20">
      {/* Greeting area */}
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Portfolio value card */}
      <div className="mb-8">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Skeleton className="h-[120px] w-full rounded-lg" />
        <Skeleton className="h-[120px] w-full rounded-lg" />
      </div>

      {/* Holdings section */}
      <div className="mb-8">
        <Skeleton className="h-6 w-24 mb-4" />
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-3 w-14 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions section */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {/* Header row */}
          <div className="flex items-center gap-4 px-6 py-3 border-b border-neutral-100">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
          {/* Data rows */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-4"
            >
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
