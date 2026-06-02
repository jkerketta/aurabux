import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShares(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export default async function HoldingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: holdings } = await supabase
    .from("holdings")
    .select("ticker, shares, avg_buy_price")
    .eq("user_id", user.id)
    .order("ticker");

  // Fetch current prices
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let enrichedHoldings: Holding[] = [];

  if (holdings && holdings.length > 0) {
    const pricePromises = holdings.map(async (h: { ticker: string; shares: number; avg_buy_price: number }) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(h.ticker)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          return Number(data.currentPrice) ?? Number(h.avg_buy_price);
        }
      } catch {
        // network error, fall through to fallback
      }
      return Number(h.avg_buy_price);
    });

    const prices = await Promise.all(pricePromises);

    enrichedHoldings = holdings.map((h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => ({
      ticker: h.ticker,
      shares: Number(h.shares),
      avg_buy_price: Number(h.avg_buy_price),
      current_price: prices[i],
    }));
  }

  return (
    <div className="mx-auto max-w-5xl pt-4">
      {/* Back button + Title */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#4B5563] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111827]">
          Holdings
        </h1>
      </div>

      {/* Holdings List */}
      {enrichedHoldings.length === 0 ? (
        <Card className="bg-white border-[#E5E7EB] shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-[#111827]">No holdings yet</p>
            <p className="mt-1 text-sm text-[#4B5563]">
              Start trading to build your portfolio
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-2">
            {enrichedHoldings.map((h) => {
              const currentValue = h.shares * h.current_price;
              const costBasis = h.shares * h.avg_buy_price;
              const pnl = currentValue - costBasis;
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
              const isPnlPositive = pnl >= 0;
              return (
                <Link
                  key={h.ticker}
                  href={`/dashboard/stock/${h.ticker}`}
                  className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{h.ticker}</p>
                    <p className="text-xs text-[#4B5563]">{formatShares(h.shares)} share{formatShares(h.shares) !== "1" ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#111827]">{formatCurrency(currentValue)} ABX</p>
                    <p className={cn(
                      "text-xs font-medium",
                      isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]"
                    )}>
                      {isPnlPositive ? "+" : ""}{formatCurrency(pnl)} ({isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    Ticker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    Shares
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    Avg Buy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    Current
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {enrichedHoldings.map((h) => {
                  const currentValue = h.shares * h.current_price;
                  const costBasis = h.shares * h.avg_buy_price;
                  const pnl = currentValue - costBasis;
                  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                  const isPnlPositive = pnl >= 0;
                  return (
                    <tr
                      key={h.ticker}
                      className="group cursor-pointer hover:bg-[#F9FAFB]"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[#111827]">{h.ticker}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#111827]">
                        {formatShares(h.shares)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4B5563]">
                        {formatCurrency(h.avg_buy_price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#4B5563]">
                        {formatCurrency(h.current_price)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-[#111827]">
                        {formatCurrency(currentValue)} ABX
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={cn(
                          "text-sm font-medium",
                          isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]"
                        )}>
                          {isPnlPositive ? "+" : ""}{formatCurrency(pnl)}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]"
                        )}>
                          ({isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
