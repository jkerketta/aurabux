"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Award } from "lucide-react";
import { HoldingsDonut } from "@/components/holdings/holdings-donut";
import { cn } from "@/lib/utils";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
  logo: string | null;
}

interface FriendPortfolioData {
  username: string;
  display_number: string | null;
  balance: number;
  total_value: number;
  holdings: Holding[];
  achievements: string[];
}

interface FriendPortfolioSheetProps {
  friendId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function FriendPortfolioSheet({ friendId, open, onOpenChange }: FriendPortfolioSheetProps) {
  const [data, setData] = useState<FriendPortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!friendId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/friends/${friendId}/portfolio`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "Failed to load friend's portfolio");
      }
    } catch {
      setError("Failed to load friend's portfolio");
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    if (open && friendId) {
      fetchData();
    }
  }, [open, friendId, fetchData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data ? (
              <>
                <ArrowLeft
                  className="h-4 w-4 cursor-pointer hover:text-[#2563EB]"
                  onClick={() => {
                    setData(null);
                    onOpenChange(false);
                  }}
                />
                {data.username}
                {data.display_number && (
                  <span className="text-sm text-[#4B5563] font-normal">
                    ({data.display_number})
                  </span>
                )}
              </>
            ) : (
              "Friend Portfolio"
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#4B5563]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#FF4444] mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
            >
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6 pb-4 overflow-y-auto">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">Balance</p>
                <p className="mt-1 text-xl font-bold text-[#111827]">{formatCurrency(data.balance)} ABX</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">Portfolio</p>
                <p className="mt-1 text-xl font-bold text-[#111827]">{formatCurrency(data.total_value)} ABX</p>
              </div>
            </div>

            {/* Donut chart */}
            {data.holdings.length > 0 && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                <h3 className="text-sm font-semibold text-[#111827] mb-4 text-center">Portfolio Allocation</h3>
                <HoldingsDonut
                  holdings={data.holdings}
                  balance={data.balance}
                  totalValue={data.total_value}
                />
              </div>
            )}

            {/* Holdings table (read-only) */}
            {data.holdings.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#111827]">Holdings</h3>
                {data.holdings.map((h) => {
                  const currentValue = h.shares * h.current_price;
                  const costBasis = h.shares * h.avg_buy_price;
                  const pnl = currentValue - costBasis;
                  const isPnlPositive = pnl >= 0;
                  return (
                    <div
                      key={h.ticker}
                      className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{h.ticker}</p>
                        <p className="text-xs text-[#4B5563]">{formatShares(h.shares)} shares</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#111827]">{formatCurrency(currentValue)} ABX</p>
                        <p className={cn("text-xs font-medium", isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                          {isPnlPositive ? "+" : ""}{formatCurrency(pnl)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[#4B5563]">
                No holdings yet
              </div>
            )}

            {/* Achievements row */}
            {data.achievements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#111827] mb-2">Recent Achievements</h3>
                <div className="flex flex-wrap gap-2">
                  {data.achievements.map((key) => (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] px-3 py-1 text-xs font-medium"
                    >
                      <Award className="h-3 w-3" />
                      {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
