import { Skeleton } from "@/components/ui/skeleton";

export default function StockDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button */}
      <Skeleton className="h-5 w-16 mb-6" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3">
          {/* Header: symbol + price */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <Skeleton className="h-9 w-24 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="text-right">
              <Skeleton className="h-9 w-32 mb-2 ml-auto" />
              <Skeleton className="h-6 w-40 ml-auto" />
            </div>
          </div>

          {/* Chart card */}
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6">
            {/* Time range buttons */}
            <div className="mb-4 flex items-center gap-2">
              {["1D", "1M", "1Y", "5Y"].map((range) => (
                <Skeleton key={range} className="h-7 w-10 rounded" />
              ))}
            </div>
            {/* Chart area */}
            <Skeleton className="h-64 w-full rounded" />
          </div>

          {/* Stock info grid */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {["Open", "High", "Low", "Prev Close"].map((label) => (
                <div key={label}>
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Trade panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            {/* Buy/Sell toggle */}
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-8 w-14 rounded" />
              <Skeleton className="h-8 w-14 rounded" />
            </div>
            <Skeleton className="h-5 w-32 mb-4" />
            {/* Mode toggle */}
            <div className="mb-4 flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-3 w-40 mb-4" />
            {/* Input */}
            <Skeleton className="h-10 w-full mb-3" />
            {/* Button */}
            <Skeleton className="h-11 w-full rounded" />
          </div>

          {/* Position panel skeleton */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
