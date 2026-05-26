import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="pb-20">
      {/* Greeting Section */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Portfolio Value Card */}
      <div className="mb-8">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-52" />
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Card className="min-h-[120px]">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-36 mb-3" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
        <Card className="min-h-[120px]">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </CardContent>
        </Card>
      </div>

      {/* Holdings Section */}
      <div className="mb-8">
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 last:border-b-0"
            >
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-14 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <div className="border-b border-neutral-100 px-6 py-3">
            <div className="flex gap-6">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-6 border-b border-neutral-100 px-6 py-4 last:border-b-0"
            >
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
