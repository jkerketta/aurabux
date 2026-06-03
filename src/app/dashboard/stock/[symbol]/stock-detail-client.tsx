"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import { TradeConfirmation } from "@/components/trade/trade-confirmation";

// ─── Types ───────────────────────────────────────────────────────────

interface QuoteData {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface CandleData {
  timestamps: number[];
  closes: number[];
  status: string;
}

interface ChartPoint {
  timestamp: number;
  price: number;
}

type TimeRange = "1D" | "1M" | "1Y" | "5Y";

interface StockDetailClientProps {
  symbol: string;
  companyName: string;
  initialQuote: QuoteData | null;
  initialCandles: CandleData | null;
  quoteError: string | null;
  availableBalance: number;
  userHolding: { shares: number; avg_buy_price: number } | null;
  portfolioTotalValue: number;
  companyInfo: {
    marketCap: number | null;
    exchange: string | null;
    weburl: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(value: number | null): string {
  if (!value) return "\u2014";
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatShares(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function getMarketStatus(): { isOpen: boolean; message: string } {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const etDate = new Date(etString);
  const day = etDate.getDay(); // 0=Sun, 6=Sat
  const hours = etDate.getHours();
  const minutes = etDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60;    // 4:00 PM
  const isOpen = day >= 1 && day <= 5 && timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  return { isOpen, message: isOpen ? "Market Open" : "Market Closed" };
}

function formatChartDate(timestamp: number, range: TimeRange): string {
  const d = new Date(timestamp * 1000);
  switch (range) {
    case "1D":
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    case "1M":
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      });
    case "1Y":
      return d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    case "5Y":
      return d.getFullYear().toString();
  }
}

function isQuoteData(v: unknown): v is QuoteData {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.symbol === "string" &&
    typeof o.currentPrice === "number" &&
    typeof o.change === "number" &&
    typeof o.high === "number" &&
    typeof o.low === "number" &&
    typeof o.open === "number" &&
    typeof o.previousClose === "number"
  );
}

function isCandleData(v: unknown): v is CandleData {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.timestamps) &&
    Array.isArray(o.closes) &&
    typeof o.status === "string"
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `Updated ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Updated ${diffHr}h ago`;
  return `Updated ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

// ─── Component ───────────────────────────────────────────────────────

export function StockDetailClient({
  symbol,
  companyName,
  initialQuote,
  initialCandles,
  quoteError: initialQuoteError,
  availableBalance,
  userHolding,
  portfolioTotalValue,
  companyInfo,
}: StockDetailClientProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────

  const [quoteData, setQuoteData] = useState<QuoteData | null>(
    initialQuote
  );
  const [quoteError] = useState<string | null>(
    initialQuote ? null : initialQuoteError
  );

  const [candleData, setCandleData] = useState<CandleData | null>(
    initialCandles
  );
  const [candleError, setCandleError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<TimeRange>("1D");
  const [candleLoading, setCandleLoading] = useState(false);

  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [buyMode, setBuyMode] = useState<"shares" | "abx">("shares");
  const [buyInput, setBuyInput] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const [sellMode, setSellMode] = useState<"shares" | "abx">("shares");
  const [sellInput, setSellInput] = useState("");
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  const [confirmationData, setConfirmationData] = useState<{
    type: "buy" | "sell";
    symbol: string;
    shares: number;
    pricePerShare: number;
    total: number;
    remainingBalance?: number;
    costBasis?: number;
    gainLoss?: number;
    gainLossPercent?: number;
  } | null>(null);

  const [confirming, setConfirming] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  // ── Last updated timer ─────────────────────────────────

  useEffect(() => {
    setLastUpdated(new Date());
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  // ── Refresh quote ──────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        toast.error("Failed to refresh quote");
        return;
      }
      const data = await res.json();
      if (isQuoteData(data)) {
        setQuoteData(data);
        setLastUpdated(new Date());
      } else {
        toast.error("Invalid quote data received");
      }
    } catch {
      toast.error("Network error — could not refresh");
    } finally {
      setRefreshing(false);
    }
  }, [symbol, refreshing]);

  // ── Fetch candles on range change ──────────────────────

  const fetchCandles = useCallback(
    async (sym: string, range: TimeRange) => {
      setCandleLoading(true);
      setCandleData(null);
      setCandleError(null);
      try {
        const res = await fetch(
          `/api/stocks/candles?symbol=${encodeURIComponent(sym)}&range=${range}`
        );
        if (!res.ok) {
          setCandleData(null);
          setCandleError("Failed to load chart data");
          return;
        }
        const data = await res.json();
        if (data.error) {
          setCandleData(null);
          setCandleError(data.error);
        } else {
          setCandleData(data);
        }
      } catch {
        setCandleData(null);
        setCandleError("Failed to load chart data");
      } finally {
        setCandleLoading(false);
      }
    },
    []
  );

  const handleRangeChange = useCallback(
    (range: TimeRange) => {
      setChartRange(range);
      fetchCandles(symbol, range);
    },
    [symbol, fetchCandles]
  );

  // ── Buy logic ──────────────────────────────────────────

  const handleBuy = useCallback(() => {
    if (!quoteData || !buyInput) return;

    const parsedInput = parseFloat(buyInput);
    if (isNaN(parsedInput) || parsedInput <= 0) {
      setBuyError("Enter a valid amount");
      return;
    }

    let shares: number;
    let totalCost: number;

    if (buyMode === "shares") {
      shares = parsedInput;
      totalCost = shares * quoteData.currentPrice;
    } else {
      totalCost = parsedInput;
      shares = totalCost / quoteData.currentPrice;
    }

    // Client-side balance check for fast feedback
    if (totalCost > availableBalance) {
      setBuyError("Insufficient ABX balance");
      return;
    }

    setBuyError(null);

    const roundedShares = Math.round(shares * 100) / 100;
    setConfirmationData({
      type: "buy",
      symbol,
      shares: roundedShares,
      pricePerShare: quoteData.currentPrice,
      total: totalCost,
      remainingBalance: availableBalance - totalCost,
    });
  }, [symbol, quoteData, buyInput, buyMode, availableBalance]);

  // ── Sell logic ─────────────────────────────────────────

  const handleSell = useCallback(() => {
    if (!quoteData || !sellInput || !userHolding) return;

    const parsedInput = parseFloat(sellInput);
    if (isNaN(parsedInput) || parsedInput <= 0) {
      setSellError("Enter a valid amount");
      return;
    }

    let shares: number;

    if (sellMode === "shares") {
      shares = parsedInput;
    } else {
      // ABX to receive → convert to shares
      const proceeds = parsedInput;
      shares = proceeds / quoteData.currentPrice;
    }

    // Client-side shares check
    if (shares > userHolding.shares) {
      setSellError("You don't own that many shares");
      return;
    }

    setSellError(null);

    const roundedShares = Math.round(shares * 100) / 100;
    const total = roundedShares * quoteData.currentPrice;
    const costBasis = roundedShares * userHolding.avg_buy_price;
    const gainLoss = total - costBasis;
    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

    setConfirmationData({
      type: "sell",
      symbol,
      shares: roundedShares,
      pricePerShare: quoteData.currentPrice,
      total,
      costBasis,
      gainLoss,
      gainLossPercent,
    });
  }, [symbol, quoteData, sellInput, sellMode, userHolding]);

  // ── Execute trade ──────────────────────────────────────

  const executeTrade = useCallback(async () => {
    if (!confirmationData || !quoteData) return;

    setConfirming(true);

    if (confirmationData.type === "buy") {
      setBuyLoading(true);
      setBuyError(null);

      try {
        const res = await fetch("/api/stocks/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: confirmationData.symbol,
            shares: confirmationData.shares,
            pricePerShare: confirmationData.pricePerShare,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setBuyError(data.error ?? "Purchase failed");
          return;
        }

        setBuyInput("");
        router.refresh();
        toast.success(
          `Bought ${data.shares_bought} shares of ${data.symbol}`
        );
      } catch {
        setBuyError("Network error — try again");
      } finally {
        setBuyLoading(false);
        setConfirming(false);
        setConfirmationData(null);
      }
    } else {
      setSellLoading(true);
      setSellError(null);

      try {
        const res = await fetch("/api/stocks/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: confirmationData.symbol,
            shares: confirmationData.shares,
            pricePerShare: confirmationData.pricePerShare,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          setSellError(data.error ?? "Sell failed");
          return;
        }

        setSellInput("");
        router.refresh();
        toast.success(
          `Sold ${data.shares_sold} shares of ${data.symbol}`
        );
      } catch {
        setSellError("Network error — try again");
      } finally {
        setSellLoading(false);
        setConfirming(false);
        setConfirmationData(null);
      }
    }
  }, [confirmationData, quoteData, router, confirming]);

  // ── Computed ───────────────────────────────────────────

  const chartData: ChartPoint[] =
    candleData?.timestamps.map((t, i) => ({
      timestamp: t,
      price: candleData.closes[i],
    })) ?? [];

  // ── Return calculation ────────────────────────────────
  const firstClose =
    candleData && candleData.closes.length > 0 ? candleData.closes[0] : null;
  const lastClose =
    candleData && candleData.closes.length > 0
      ? candleData.closes[candleData.closes.length - 1]
      : null;
  const pctReturn =
    firstClose && lastClose && firstClose !== 0
      ? ((lastClose - firstClose) / firstClose) * 100
      : 0;
  const absReturn = firstClose && lastClose ? lastClose - firstClose : 0;
  const isReturnPositive = absReturn >= 0;

  const isUp = quoteData ? quoteData.change >= 0 : true;
  const chartColor = isUp ? "#00C805" : "#FF4444";

  const marketStatus = getMarketStatus();

  const currentPrice = quoteData?.currentPrice ?? 0;
  const computedShares =
    buyMode === "abx" && buyInput
      ? parseFloat(buyInput) / currentPrice
      : 0;
  const computedCost =
    buyMode === "shares" && buyInput
      ? parseFloat(buyInput) * currentPrice
      : 0;
  const computedSellProceeds =
    sellMode === "shares" && sellInput
      ? parseFloat(sellInput) * currentPrice
      : 0;
  const computedSellShares =
    sellMode === "abx" && sellInput
      ? parseFloat(sellInput) / currentPrice
      : 0;

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-0 pt-4">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#4B5563] transition-colors hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* ── Left column: Header + Chart + Info ─────────── */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#111827]">
                  {symbol}
                </h1>
                <p className="mt-0.5 text-sm text-[#4B5563]">
                  {companyName}
                </p>
              </div>

              {quoteError ? (
                <p className="text-sm text-[#FF4444]">{quoteError}</p>
              ) : quoteData ? (
                <div className="text-right">
                  <p className="text-xl sm:text-3xl font-bold text-[#111827]">
                    ${formatCurrency(quoteData.currentPrice)}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    {quoteData.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-[#00C805]" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-[#FF4444]" />
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        quoteData.change >= 0
                          ? "border-[#00C805] text-[#00C805]"
                          : "border-[#FF4444] text-[#FF4444]"
                      )}
                    >
                      {quoteData.change >= 0 ? "+" : ""}
                      {formatCurrency(quoteData.change)} (
                      {quoteData.changePercent >= 0 ? "+" : ""}
                      {quoteData.changePercent.toFixed(2)}%)
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-end">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      marketStatus.isOpen ? "border-[#00C805] text-[#00C805]" : "border-[#4B5563] text-[#4B5563]"
                    )}>
                      {marketStatus.message}
                    </Badge>
                  </div>
                  {lastUpdated && (
                    <div className="mt-1 flex items-center justify-end gap-1.5 text-xs text-[#4B5563]">
                      <span>{formatRelativeTime(lastUpdated)}</span>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded p-0.5 transition-colors hover:text-[#111827] disabled:opacity-50"
                        aria-label="Refresh quote"
                      >
                        <RotateCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Time range buttons */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                {(["1D", "1M", "1Y", "5Y"] as const).map((range) => {
                  const isActive = chartRange === range;
                  const showBadge = isActive && range !== "1D" && chartData.length >= 2;

                  return (
                    <div key={range} className="relative flex flex-col items-center">
                      {/* Return badge */}
                      {showBadge && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 mb-1">
                          <div className={cn(
                            "rounded px-2 py-1 text-xs font-semibold text-[#111827]",
                            isReturnPositive ? "bg-[#00C805]" : "bg-[#FF4444]"
                          )}>
                            {pctReturn >= 0 ? "+" : ""}{pctReturn.toFixed(2)}%
                          </div>
                          <div className={cn(
                            "absolute left-1/2 -bottom-1 -translate-x-1/2 h-2 w-2 rotate-45",
                            isReturnPositive ? "bg-[#00C805]" : "bg-[#FF4444]"
                          )} />
                        </div>
                      )}

                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleRangeChange(range)}
                        className={cn(
                          "h-7 px-3 text-xs",
                          isActive
                            ? "bg-[#2563EB] text-white"
                            : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                        )}
                      >
                        {range}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Chart area */}
              <div className="h-48 sm:h-64">
                {candleLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#4B5563]" />
                  </div>
                ) : candleError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <p className="text-sm text-[#FF4444]">{candleError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCandles(symbol, chartRange)}
                      className="h-7 px-3 text-xs border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                    >
                      Retry
                    </Button>
                  </div>
                ) : candleData?.status === "no_data" ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#4B5563]">
                    No historical data for this stock
                  </div>
                ) : chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 5, bottom: 30, left: 5 }}
                    >
                      <defs>
                        <linearGradient
                          id={`gradient-${symbol}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={chartColor}
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="100%"
                            stopColor={chartColor}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b6b6b" }}
                        interval="preserveStartEnd"
                        minTickGap={40}
                        tickFormatter={(ts: number) => formatChartDate(ts, chartRange)}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b6b6b" }}
                        tickFormatter={formatCompact}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          border: "1px solid #e5e5e5",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                          fontSize: "13px",
                        }}
                        labelStyle={{ fontWeight: 600, color: "#1a1a1a" }}
                        labelFormatter={(ts: number) => formatChartDate(ts, chartRange)}
                        formatter={(value: number) => [
                          `$${formatCurrency(Number(value))}`,
                          "Price",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={2}
                        fill={`url(#gradient-${symbol})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#4B5563]">
                    Failed to load chart data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Info Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                {[
                  {
                    label: "Open",
                    value: quoteData
                      ? `$${formatCurrency(quoteData.open)}`
                      : "—",
                  },
                  {
                    label: "High",
                    value: quoteData
                      ? `$${formatCurrency(quoteData.high)}`
                      : "—",
                  },
                  {
                    label: "Low",
                    value: quoteData
                      ? `$${formatCurrency(quoteData.low)}`
                      : "—",
                  },
                  {
                    label: "Prev Close",
                    value: quoteData
                      ? `$${formatCurrency(quoteData.previousClose)}`
                      : "—",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#111827]">
                      {quoteError ? "—" : item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="mb-4 text-base font-semibold text-[#111827]">
                Company Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#4B5563]">Market Cap</span>
                  <span className="text-sm font-semibold text-[#111827]">
                    {formatMarketCap(companyInfo?.marketCap ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#4B5563]">Exchange</span>
                  <span className="text-sm font-semibold text-[#111827]">
                    {companyInfo?.exchange ?? "\u2014"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#4B5563]">Website</span>
                  <span className="text-sm font-semibold text-[#111827]">
                    {companyInfo?.weburl ? (
                      <a
                        href={companyInfo.weburl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
                      >
                        {new URL(companyInfo.weburl).hostname}
                      </a>
                    ) : (
                      "\u2014"
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: Trade Panel + Position ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trade Panel */}
          <Card>
            <CardContent className="p-6">
              {/* Buy/Sell Toggle */}
              <div className="mb-4 flex items-center gap-2">
                {(["buy", "sell"] as const).map((mode) => {
                  const isSellDisabled =
                    mode === "sell" &&
                    (!userHolding || userHolding.shares <= 0);
                  return (
                    <Button
                      key={mode}
                      variant={tradeMode === mode ? "default" : "outline"}
                      size="sm"
                      disabled={isSellDisabled}
                      onClick={() => {
                        setTradeMode(mode);
                        setBuyInput("");
                        setBuyError(null);
                        setSellInput("");
                        setSellError(null);
                      }}
                      className={cn(
                        "h-8 px-4 text-xs capitalize",
                        tradeMode === mode
                          ? "bg-[#2563EB] text-white"
                          : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]",
                        isSellDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {mode}
                    </Button>
                  );
                })}
              </div>

              <h3 className="mb-4 text-base font-semibold text-[#111827]">
                {tradeMode === "buy" ? "Buy" : "Sell"} {symbol}
              </h3>

              {/* ── BUY FORM ────────────────────────────── */}
              {tradeMode === "buy" && (
                <>
                  {/* Mode Toggle */}
                  <div className="mb-4 flex items-center gap-2">
                    {(["shares", "abx"] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={buyMode === mode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setBuyMode(mode);
                          setBuyInput("");
                          setBuyError(null);
                        }}
                        className={cn(
                          "h-8 px-4 text-xs capitalize",
                          buyMode === mode
                            ? "bg-[#2563EB] text-white"
                            : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                        )}
                      >
                        {mode === "shares" ? "Shares" : "ABX Amount"}
                      </Button>
                    ))}
                  </div>

                  {/* Price display */}
                  {quoteData && (
                    <p className="mb-1 text-sm text-[#4B5563]">
                      Current price:{" "}
                      <span className="font-semibold text-[#111827]">
                        ${formatCurrency(quoteData.currentPrice)}
                      </span>
                    </p>
                  )}
                  <p className="mb-4 text-xs text-[#4B5563]">
                    Available:{" "}
                    <span className="font-medium text-[#111827]">
                      {formatCurrency(availableBalance)} ABX
                    </span>
                  </p>

                  {/* Input */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-[#4B5563]">
                      {buyMode === "shares"
                        ? "Number of shares"
                        : "ABX to spend"}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step={buyMode === "shares" ? "1" : "0.01"}
                      value={buyInput}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setBuyInput(e.target.value);
                        setBuyError(null);
                      }}
                      placeholder={
                        buyMode === "shares" ? "e.g. 10" : "e.g. 500"
                      }
                      className="h-10 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1"
                      disabled={!quoteData}
                    />
                  </div>

                  {/* Calculated values */}
                  {buyInput && quoteData && !isNaN(parseFloat(buyInput)) && (
                    <p className="mb-3 text-xs text-[#4B5563]">
                      {buyMode === "shares" ? (
                        <>
                          Total cost:{" "}
                          <span className="font-medium text-[#111827]">
                            {formatCurrency(computedCost)} ABX
                          </span>
                        </>
                      ) : (
                        <>
                          You&apos;ll get approx.{" "}
                          <span className="font-medium text-[#111827]">
                            {computedShares < 1
                              ? computedShares.toFixed(4)
                              : computedShares.toFixed(2)}{" "}
                            share{computedShares !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  )}

                  {/* Buy button */}
                  <Button
                    onClick={handleBuy}
                    disabled={!buyInput || buyLoading || !quoteData}
                    className="h-11 w-full bg-[#2563EB] text-base text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {buyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buying...
                      </>
                    ) : (
                      "Buy"
                    )}
                  </Button>

                  {/* Buy Error */}
                  {buyError && (
                    <p className="mt-3 text-xs font-medium text-[#FF4444]">
                      {buyError}
                    </p>
                  )}
                </>
              )}

              {/* ── SELL FORM ───────────────────────────── */}
              {tradeMode === "sell" && userHolding && (
                <>
                  {/* Mode Toggle */}
                  <div className="mb-4 flex items-center gap-2">
                    {(["shares", "abx"] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={sellMode === mode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSellMode(mode);
                          setSellInput("");
                          setSellError(null);
                        }}
                        className={cn(
                          "h-8 px-4 text-xs capitalize",
                          sellMode === mode
                            ? "bg-[#2563EB] text-white"
                            : "border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
                        )}
                      >
                        {mode === "shares" ? "Shares" : "ABX to receive"}
                      </Button>
                    ))}
                  </div>

                  {/* Price display */}
                  {quoteData && (
                    <p className="mb-1 text-sm text-[#4B5563]">
                      Current price:{" "}
                      <span className="font-semibold text-[#111827]">
                        ${formatCurrency(quoteData.currentPrice)}
                      </span>
                    </p>
                  )}
                  <p className="mb-4 text-xs text-[#4B5563]">
                    Available to sell:{" "}
                    <span className="font-medium text-[#111827]">
                      {formatShares(userHolding.shares)} share{formatShares(userHolding.shares) !== "1" ? "s" : ""}
                    </span>
                  </p>

                  {/* Input */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-[#4B5563]">
                      {sellMode === "shares"
                        ? "Number of shares to sell"
                        : "ABX to receive"}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step={sellMode === "shares" ? "1" : "0.01"}
                        value={sellInput}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setSellInput(e.target.value);
                          setSellError(null);
                        }}
                        placeholder={
                          sellMode === "shares"
                            ? `e.g. ${Math.min(Number(formatShares(userHolding.shares)), 10)}`
                            : "e.g. 500"
                        }
                        className="h-10 flex-1 focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-1"
                        disabled={!quoteData}
                      />
                      {sellMode === "shares" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSellInput(String(userHolding.shares));
                            setSellError(null);
                          }}
                          className="h-10 shrink-0 border-[#E5E7EB] text-xs text-[#4B5563] hover:bg-[#F9FAFB]"
                          disabled={!quoteData}
                        >
                          Max
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Calculated values */}
                  {sellInput && quoteData && !isNaN(parseFloat(sellInput)) && (
                    <p className="mb-3 text-xs text-[#4B5563]">
                      {sellMode === "shares" ? (
                        <>
                          You&apos;ll receive approx.{" "}
                          <span className="font-medium text-[#111827]">
                            {formatCurrency(computedSellProceeds)} ABX
                          </span>
                        </>
                      ) : (
                        <>
                          You&apos;ll sell approx.{" "}
                          <span className="font-medium text-[#111827]">
                            {computedSellShares < 1
                              ? computedSellShares.toFixed(4)
                              : computedSellShares.toFixed(2)}{" "}
                            share{computedSellShares !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  )}

                  {/* Sell button */}
                  <Button
                    onClick={handleSell}
                    disabled={!sellInput || sellLoading || !quoteData}
                    className="h-11 w-full bg-[#2563EB] text-base text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {sellLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Selling...
                      </>
                    ) : (
                      "Sell"
                    )}
                  </Button>

                  {/* Sell Error */}
                  {sellError && (
                    <p className="mt-3 text-xs font-medium text-[#FF4444]">
                      {sellError}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Your Position Panel */}
          {userHolding && quoteData && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-base font-semibold text-[#111827]">
                  Your Position
                </h3>

                <div className="space-y-3">
                  {/* Shares */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5563]">Shares</span>
                    <span className="text-sm font-semibold text-[#111827]">
                      {formatShares(userHolding.shares)} share{formatShares(userHolding.shares) !== "1" ? "s" : ""}
                    </span>
                  </div>

                  {/* Avg Buy Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5563]">Avg Buy Price</span>
                    <span className="text-sm font-semibold text-[#111827]">
                      ${formatCurrency(userHolding.avg_buy_price)}
                    </span>
                  </div>

                  {/* Current Value */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5563]">Current Value</span>
                    <span className="text-sm font-semibold text-[#111827]">
                      ${formatCurrency(quoteData.currentPrice * userHolding.shares)}
                    </span>
                  </div>

                  {/* Total Return */}
                  {(() => {
                    const totalReturnDollars =
                      (quoteData.currentPrice - userHolding.avg_buy_price) *
                      userHolding.shares;
                    const totalReturnPct =
                      userHolding.avg_buy_price !== 0
                        ? ((quoteData.currentPrice - userHolding.avg_buy_price) /
                            userHolding.avg_buy_price) *
                          100
                        : 0;
                    const isTotalPositive = totalReturnDollars >= 0;
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#4B5563]">Total Return</span>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isTotalPositive ? "text-[#00C805]" : "text-[#FF4444]"
                          )}
                        >
                          {isTotalPositive ? "+" : ""}$
                          {formatCurrency(Math.abs(totalReturnDollars))} (
                          {totalReturnPct >= 0 ? "+" : ""}
                          {totalReturnPct.toFixed(2)}%)
                        </span>
                      </div>
                    );
                  })()}

                  {/* Today's Return */}
                  {firstClose !== null && lastClose !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#4B5563]">Today&apos;s Return</span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          absReturn >= 0 ? "text-[#00C805]" : "text-[#FF4444]"
                        )}
                      >
                        {absReturn >= 0 ? "+" : ""}$
                        {formatCurrency(Math.abs(absReturn * userHolding.shares))} (
                        {pctReturn >= 0 ? "+" : ""}
                        {pctReturn.toFixed(2)}%)
                      </span>
                    </div>
                  )}

                  {/* % of Portfolio */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#4B5563]">% of Portfolio</span>
                    <span className="text-sm font-semibold text-[#111827]">
                      {portfolioTotalValue > 0
                        ? (
                            ((quoteData.currentPrice * userHolding.shares) /
                              portfolioTotalValue) *
                            100
                          ).toFixed(2)
                        : "0.00"}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trade Confirmation Dialog */}
          {confirmationData && (
            <TradeConfirmation
              open={!!confirmationData}
              onOpenChange={(open) => { if (!open) setConfirmationData(null); }}
              onConfirm={executeTrade}
              confirming={confirming}
              {...confirmationData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
