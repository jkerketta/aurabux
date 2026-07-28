"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StockLogo } from "@/components/holdings/stock-logo";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface WatchlistItem {
  ticker: string;
  currentPrice: number | null;
  changePercent: number | null;
  logo: string | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function WatchlistGrid() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch("/api/watchlist");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setItems(data.watchlist ?? []);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#111827]">Your Watchlist</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-[#E5E7EB] bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-8 text-center py-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#111827]">Your Watchlist</h2>
        <p className="text-sm text-[#4B5563]">
          No stocks in your watchlist yet.
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">
          Search for a stock and tap the <Star className="inline h-3 w-3" /> icon to add it.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#111827]">Your Watchlist</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <button
            key={item.ticker}
            onClick={() => router.push(`/dashboard/stock/${item.ticker}`)}
            className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 hover:bg-[#F9FAFB] transition-colors text-left"
          >
            <StockLogo logo={item.logo} ticker={item.ticker} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111827] truncate">{item.ticker}</p>
              {item.currentPrice !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#4B5563]">${formatCurrency(item.currentPrice)}</span>
                  {item.changePercent !== null && (
                    <span className={cn(
                      "text-[10px] font-medium",
                      item.changePercent >= 0 ? "text-[#00C805]" : "text-[#FF4444]"
                    )}>
                      {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
