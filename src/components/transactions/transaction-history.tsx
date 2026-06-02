"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Transaction {
  ticker: string;
  type: "buy" | "sell" | "spin";
  shares: number;
  price_per_share: number;
  created_at: string;
}

interface TransactionHistoryProps {
  initialTransactions?: Transaction[];
}

interface ApiResponse {
  transactions: Transaction[];
  page: number;
  totalPages: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const colorMap: Record<string, string> = {
  buy: "bg-[#00C805]/10 text-[#00A804]",
  sell: "bg-[#FF4444]/10 text-[#CC3333]",
  spin: "bg-[#6366F1]/10 text-[#6366F1]",
};

const labelMap: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  spin: "Spin",
};

function SkeletonRows() {
  return (
    <tbody className="divide-y divide-neutral-100">
          {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-6 py-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-6 py-4">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="px-6 py-4">
            <Skeleton className="h-5 w-12 rounded-full" />
          </td>
          <td className="px-6 py-4">
            <Skeleton className="h-4 w-8" />
          </td>
          <td className="px-6 py-4">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="px-6 py-4">
            <Skeleton className="h-4 w-20" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export function TransactionHistory({ initialTransactions }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(
    initialTransactions ?? []
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(initialTransactions ? false : true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions?page=${pageNum}`);
      if (!res.ok) {
        throw new Error("Failed to load transactions");
      }
      const data: ApiResponse = await res.json();
      setTransactions(data.transactions);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount (only if no initialTransactions) or when page changes
  useEffect(() => {
    if (!initialTransactions) {
      fetchTransactions(page);
    }
  }, [page, initialTransactions, fetchTransactions]);

  // If initialTransactions provided, use them for page 1 and fetch from API for other pages
  useEffect(() => {
    if (initialTransactions && initialTransactions.length > 0) {
      setTransactions(initialTransactions);
      // Fetch total pages from API
      fetch("/api/transactions?page=1")
        .then((res) => res.json())
        .then((data: ApiResponse) => {
          setTotalPages(data.totalPages);
        })
        .catch(() => {
          // Silently fail — we already have initial data
        });
    }
  }, [initialTransactions]);

  const handlePageChange = (newPage: number) => {
    if (initialTransactions && newPage === 1) {
      setTransactions(initialTransactions);
      setPage(1);
      return;
    }
    fetchTransactions(newPage);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-white py-12 text-center">
        <p className="text-sm font-medium text-[#111827]">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => fetchTransactions(page)}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        {/* Mobile skeleton */}
        <div className="sm:hidden space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24 mb-2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        {/* Desktop skeleton table */}
        <table className="hidden sm:table w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Shares
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Total
              </th>
            </tr>
          </thead>
          <SkeletonRows />
        </table>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[#E5E7EB] bg-white py-12 text-center">
        <p className="text-sm font-medium text-[#111827]">No transactions yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your trade history will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`skeleton-mobile-${i}`}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24 mb-2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))
          : transactions.map((t, i) => {
              const total = t.shares * t.price_per_share;
              return (
                <div
                  key={`mobile-${t.created_at}-${i}`}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#111827]">
                      {t.ticker}
                    </span>
                    <Badge
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold",
                        colorMap[t.type] ?? "bg-neutral-100 text-neutral-700"
                      )}
                    >
                      {labelMap[t.type] ?? t.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[#4B5563]">
                    {t.shares} shares × ${formatCurrency(t.price_per_share)}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#111827]">
                      ${formatCurrency(total)}
                    </span>
                    <span className="text-xs text-[#4B5563]">
                      {formatDate(t.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Ticker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Shares
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              : transactions.map((t, i) => {
                  const total = t.shares * t.price_per_share;
                  return (
                    <tr key={`${t.created_at}-${i}`} className="group">
                      <td className="px-6 py-4 text-sm text-[#4B5563]">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#111827]">
                        {t.ticker}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold",
                            colorMap[t.type] ?? "bg-neutral-100 text-neutral-700"
                          )}
                        >
                          {labelMap[t.type] ?? t.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-[#111827]">
                        {t.shares}
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-[#111827]">
                        {formatCurrency(t.price_per_share)}
                      </td>
                      <td className="px-6 py-4 text-left text-sm font-medium text-[#111827]">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1 || loading}
          onClick={() => handlePageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-[#4B5563]">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages || loading}
          onClick={() => handlePageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
