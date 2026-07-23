import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { HoldingsDonut } from "@/components/holdings/holdings-donut";
import { HoldingsTable } from "@/components/holdings/holdings-table";
import { StockLogo } from "@/components/holdings/stock-logo";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
  logo: string | null;
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

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("abx_balance")
    .eq("user_id", user.id)
    .single();

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
  let balance = Number(portfolio?.abx_balance ?? 10000);

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
        // network error, fall through
      }
      return Number(h.avg_buy_price);
    });

    const logoPromises = holdings.map(async (h: { ticker: string }) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/stocks/profile?symbol=${encodeURIComponent(h.ticker)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          return data.logo ?? null;
        }
      } catch {
        // network error, fall through
      }
      return null;
    });

    const [prices, logos] = await Promise.all([Promise.all(pricePromises), Promise.all(logoPromises)]);

    enrichedHoldings = holdings.map((h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => ({
      ticker: h.ticker,
      shares: Number(h.shares),
      avg_buy_price: Number(h.avg_buy_price),
      current_price: prices[i],
      logo: logos[i],
    }));
  }

  const totalValue = balance + enrichedHoldings.reduce((sum, h) => sum + h.shares * h.current_price, 0);

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
          {/* Donut Chart */}
          <div className="mb-8 rounded-lg border border-[#E5E7EB] bg-white p-6">
            <h2 className="mb-6 text-lg font-semibold tracking-tight text-[#111827] text-center">
              Portfolio Allocation
            </h2>
            <HoldingsDonut
              holdings={enrichedHoldings}
              balance={balance}
              totalValue={totalValue}
            />
          </div>

          {/* Holdings Table (Desktop) */}
          <HoldingsTable holdings={enrichedHoldings} />

          {/* Holdings Cards (Mobile) */}
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
                  <div className="flex items-center gap-3">
                    <StockLogo logo={h.logo} ticker={h.ticker} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{h.ticker}</p>
                      <p className="text-xs text-[#4B5563]">{formatShares(h.shares)} share{formatShares(h.shares) !== "1" ? "s" : ""}</p>
                    </div>
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
        </>
      )}
    </div>
  );
}
