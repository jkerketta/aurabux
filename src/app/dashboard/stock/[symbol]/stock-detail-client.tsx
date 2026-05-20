"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";

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
  date: string;
  price: number;
}

type TimeRange = "1D" | "1M" | "1Y" | "5Y";

interface StockDetailClientProps {
  symbol: string;
  companyName: string;
  initialQuote: Record<string, unknown> | null;
  initialCandles: Record<string, unknown> | null;
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

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
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

// ─── Component ───────────────────────────────────────────────────────

export function StockDetailClient({
  symbol,
  companyName,
  initialQuote: rawInitialQuote,
  initialCandles: rawInitialCandles,
  quoteError: initialQuoteError,
  availableBalance,
  userHolding,
  portfolioTotalValue,
  companyInfo,
}: StockDetailClientProps) {
  const router = useRouter();

  // Coerce initial data to typed form
  const typedInitialQuote = isQuoteData(rawInitialQuote)
    ? rawInitialQuote
    : null;
  const typedInitialCandles = isCandleData(rawInitialCandles)
    ? rawInitialCandles
    : null;

  // ── State ──────────────────────────────────────────────

  const [quoteData, setQuoteData] = useState<QuoteData | null>(
    typedInitialQuote
  );
  const [quoteError] = useState<string | null>(
    typedInitialQuote ? null : initialQuoteError
  );

  const [candleData, setCandleData] = useState<CandleData | null>(
    typedInitialCandles
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

  const handleBuy = useCallback(async () => {
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

    setBuyLoading(true);
    setBuyError(null);

    try {
      const res = await fetch("/api/stocks/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          shares: Math.round(shares * 100) / 100,
          pricePerShare: quoteData.currentPrice,
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
    }
  }, [symbol, quoteData, buyInput, buyMode, availableBalance, router]);

  // ── Sell logic ─────────────────────────────────────────

  const handleSell = useCallback(async () => {
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

    setSellLoading(true);
    setSellError(null);

    try {
      const res = await fetch("/api/stocks/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          shares: Math.round(shares * 100) / 100,
          pricePerShare: quoteData.currentPrice,
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
    }
  }, [symbol, quoteData, sellInput, sellMode, userHolding, router]);

  // ── Computed ───────────────────────────────────────────

  const chartData: ChartPoint[] =
    candleData?.timestamps.map((t, i) => ({
      date: formatDate(t),
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
    <div className="mx-auto max-w-5xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-black"
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
                <h1 className="text-3xl font-bold tracking-tight text-black">
                  {symbol}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {companyName}
                </p>
              </div>

              {quoteError ? (
                <p className="text-sm text-[#FF4444]">{quoteError}</p>
              ) : quoteData ? (
                <div className="text-right">
                  <p className="text-3xl font-bold tracking-tight text-black">
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
                </div>
              ) : null}
            </div>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {/* Time range buttons */}
              <div className="mb-4 flex items-center gap-2">
                {(["1D", "1M", "1Y", "5Y"] as const).map((range) => {
                  const isActive = chartRange === range;
                  const showBadge = isActive && range !== "1D" && chartData.length >= 2;

                  return (
                    <div key={range} className="relative flex flex-col items-center">
                      {/* Return badge */}
                      {showBadge && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 mb-1">
                          <div className={cn(
                            "rounded px-2 py-1 text-xs font-semibold text-black",
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
                            ? "bg-black text-white"
                            : "border-neutral-200 text-muted-foreground hover:bg-neutral-100"
                        )}
                      >
                        {range}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Chart area */}
              <div className="h-64">
                {candleLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : candleError ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#FF4444]">
                    {candleError}
                  </div>
                ) : candleData?.status === "no_data" ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No historical data for this stock
                  </div>
                ) : chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
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
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#6b6b6b" }}
                        interval="preserveStartEnd"
                        minTickGap={40}
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
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Failed to load chart data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Info Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-black">
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
              <h3 className="mb-4 text-base font-semibold text-black">
                Company Info
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Market Cap</span>
                  <span className="text-sm font-semibold text-black">
                    {formatMarketCap(companyInfo?.marketCap ?? null)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Exchange</span>
                  <span className="text-sm font-semibold text-black">
                    {companyInfo?.exchange ?? "\u2014"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Website</span>
                  <span className="text-sm font-semibold text-black">
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
                          ? "bg-black text-white"
                          : "border-neutral-200 text-muted-foreground hover:bg-neutral-100",
                        isSellDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {mode}
                    </Button>
                  );
                })}
              </div>

              <h3 className="mb-4 text-base font-semibold text-black">
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
                            ? "bg-black text-white"
                            : "border-neutral-200 text-muted-foreground hover:bg-neutral-100"
                        )}
                      >
                        {mode === "shares" ? "Shares" : "ABX Amount"}
                      </Button>
                    ))}
                  </div>

                  {/* Price display */}
                  {quoteData && (
                    <p className="mb-1 text-sm text-muted-foreground">
                      Current price:{" "}
                      <span className="font-semibold text-black">
                        ${formatCurrency(quoteData.currentPrice)}
                      </span>
                    </p>
                  )}
                  <p className="mb-4 text-xs text-muted-foreground">
                    Available:{" "}
                    <span className="font-medium text-black">
                      {formatCurrency(availableBalance)} ABX
                    </span>
                  </p>

                  {/* Input */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                      className="h-10"
                      disabled={!quoteData}
                    />
                  </div>

                  {/* Calculated values */}
                  {buyInput && quoteData && !isNaN(parseFloat(buyInput)) && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {buyMode === "shares" ? (
                        <>
                          Total cost:{" "}
                          <span className="font-medium text-black">
                            {formatCurrency(computedCost)} ABX
                          </span>
                        </>
                      ) : (
                        <>
                          You&apos;ll get approx.{" "}
                          <span className="font-medium text-black">
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
                    className="h-11 w-full bg-black text-base text-white hover:bg-neutral-800"
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
                            ? "bg-black text-white"
                            : "border-neutral-200 text-muted-foreground hover:bg-neutral-100"
                        )}
                      >
                        {mode === "shares" ? "Shares" : "ABX to receive"}
                      </Button>
                    ))}
                  </div>

                  {/* Price display */}
                  {quoteData && (
                    <p className="mb-1 text-sm text-muted-foreground">
                      Current price:{" "}
                      <span className="font-semibold text-black">
                        ${formatCurrency(quoteData.currentPrice)}
                      </span>
                    </p>
                  )}
                  <p className="mb-4 text-xs text-muted-foreground">
                    Available to sell:{" "}
                    <span className="font-medium text-black">
                      {userHolding.shares} share{userHolding.shares !== 1 ? "s" : ""}
                    </span>
                  </p>

                  {/* Input */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                            ? `e.g. ${Math.min(userHolding.shares, 10)}`
                            : "e.g. 500"
                        }
                        className="h-10 flex-1"
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
                          className="h-10 shrink-0 border-neutral-200 text-xs text-muted-foreground hover:bg-neutral-100"
                          disabled={!quoteData}
                        >
                          Max
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Calculated values */}
                  {sellInput && quoteData && !isNaN(parseFloat(sellInput)) && (
                    <p className="mb-3 text-xs text-muted-foreground">
                      {sellMode === "shares" ? (
                        <>
                          You&apos;ll receive approx.{" "}
                          <span className="font-medium text-black">
                            {formatCurrency(computedSellProceeds)} ABX
                          </span>
                        </>
                      ) : (
                        <>
                          You&apos;ll sell approx.{" "}
                          <span className="font-medium text-black">
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
                    className="h-11 w-full bg-black text-base text-white hover:bg-neutral-800"
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
                <h3 className="mb-4 text-base font-semibold text-black">
                  Your Position
                </h3>

                <div className="space-y-3">
                  {/* Shares */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Shares</span>
                    <span className="text-sm font-semibold text-black">
                      {userHolding.shares} share{userHolding.shares !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Avg Buy Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Buy Price</span>
                    <span className="text-sm font-semibold text-black">
                      ${formatCurrency(userHolding.avg_buy_price)}
                    </span>
                  </div>

                  {/* Current Value */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Current Value</span>
                    <span className="text-sm font-semibold text-black">
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
                        <span className="text-xs text-muted-foreground">Total Return</span>
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
                      <span className="text-xs text-muted-foreground">Today&apos;s Return</span>
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
                    <span className="text-xs text-muted-foreground">% of Portfolio</span>
                    <span className="text-sm font-semibold text-black">
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


        </div>
      </div>
    </div>
  );
}
