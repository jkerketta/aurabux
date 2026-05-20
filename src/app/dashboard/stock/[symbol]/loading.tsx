import { Card, CardContent } from "@/components/ui/card";

export default function StockDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button placeholder */}
      <div className="mb-6 h-5 w-16 rounded bg-neutral-100" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3">
          {/* Header placeholder */}
          <div className="mb-6">
            <div className="h-9 w-24 rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-48 rounded bg-neutral-100" />
          </div>

          {/* Chart placeholder */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Time range buttons placeholder */}
              <div className="mb-4 flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-7 w-10 rounded bg-neutral-100" />
                ))}
              </div>
              {/* Chart area placeholder */}
              <div className="h-64 rounded bg-neutral-50" />
            </CardContent>
          </Card>

          {/* Stock Info placeholder */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-12 rounded bg-neutral-100" />
                    <div className="mt-2 h-4 w-16 rounded bg-neutral-100" />
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
                <div className="h-8 w-16 rounded bg-neutral-100" />
                <div className="h-8 w-16 rounded bg-neutral-100" />
              </div>
              <div className="h-6 w-24 rounded bg-neutral-100" />
              <div className="mt-4 h-10 w-full rounded bg-neutral-100" />
              <div className="mt-3 h-11 w-full rounded bg-neutral-800" />
            </CardContent>
          </Card>

          {/* Position panel placeholder */}
          <Card>
            <CardContent className="p-6">
              <div className="h-6 w-28 rounded bg-neutral-100" />
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-neutral-100" />
                    <div className="h-4 w-24 rounded bg-neutral-100" />
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
