import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function StockDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button placeholder */}
      <Skeleton className="h-5 w-16 mb-6" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3">
          {/* Header placeholder */}
          <div className="mb-6">
            <Skeleton className="h-9 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Chart placeholder */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Time range buttons placeholder */}
              <div className="mb-4 flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-7 w-10" />
                ))}
              </div>
              {/* Chart area placeholder */}
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>

          {/* Stock Info placeholder */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-12 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trade panel placeholder */}
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-10 w-full mb-3" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>

          {/* Position panel placeholder */}
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-28 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
