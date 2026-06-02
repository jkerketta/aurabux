import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function HoldingsLoading() {
  return (
    <div className="mx-auto max-w-5xl pt-4">
      {/* Back button + Title skeleton */}
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Summary card skeleton */}
      <Card className="mb-6">
        <CardContent className="py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Mobile skeleton cards */}
      <div className="md:hidden space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton table */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-12" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
