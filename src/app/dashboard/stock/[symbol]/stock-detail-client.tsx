"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
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
  DollarSign,
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

type TimeRange = "1M" | "1Y" | "ALL";

interface StockDetailClientProps {
  symbol: string;
  companyName: string;
  initialQuote: Record<string, unknown> | null;
  initialCandles: Record<string, unknown> | null;
  quoteError: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const [chartRange, setChartRange] = useState<TimeRange>("1M");
  const [candleLoading, setCandleLoading] = useState(false);

  const [buyMode, setBuyMode] = useState<"shares" | "abx">("shares");
  const [buyInput, setBuyInput] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // ── Fetch candles on range change ──────────────────────

  const fetchCandles = useCallback(
    async (sym: string, range: TimeRange) => {
      setCandleLoading(true);
      setCandleData(null);
      try {
        const res = await fetch(
          `/api/stocks/candles?symbol=${encodeURIComponent(sym)}&range=${range}`
        );
        const data = await res.json();
        if (data.error) {
          setCandleData(null);
        } else {
          setCandleData(data);
        }
      } catch {
        setCandleData(null);
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

    setBuyLoading(true);
    setBuyError(null);
    setBuySuccess(false);

    let shares: number;
    let totalCost: number;

    if (buyMode === "shares") {
      shares = parsedInput;
      totalCost = shares * quoteData.currentPrice;
    } else {
      totalCost = parsedInput;
      shares = totalCost / quoteData.currentPrice;
    }

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

      setBuySuccess(true);
      setBalance(data.balance);
      setBuyInput("");
    } catch {
      setBuyError("Network error — try again");
    } finally {
      setBuyLoading(false);
    }
  }, [symbol, quoteData, buyInput, buyMode]);

  // ── Computed ───────────────────────────────────────────

  const chartData: ChartPoint[] =
    candleData?.timestamps.map((t, i) => ({
      date: formatDate(t),
      price: candleData.closes[i],
    })) ?? [];

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
                {(["1M", "1Y", "ALL"] as const).map((range) => (
                  <Button
                    key={range}
                    variant={chartRange === range ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRangeChange(range)}
                    className={cn(
                      "h-7 px-3 text-xs",
                      chartRange === range
                        ? "bg-black text-white"
                        : "border-neutral-200 text-muted-foreground hover:bg-neutral-100"
                    )}
                  >
                    {range}
                  </Button>
                ))}
              </div>

              {/* Chart area */}
              <div className="h-64">
                {candleLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
        </div>

        {/* ── Right column: Buy Panel ───────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-base font-semibold text-black">
                Buy {symbol}
              </h3>

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
                      setBuySuccess(false);
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
                <p className="mb-4 text-sm text-muted-foreground">
                  Current price:{" "}
                  <span className="font-semibold text-black">
                    ${formatCurrency(quoteData.currentPrice)}
                  </span>
                </p>
              )}

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
                    setBuySuccess(false);
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
                        shares
                      </span>
                    </>
                  )}
                </p>
              )}

              {/* Buy button */}
              <Button
                onClick={handleBuy}
                disabled={!buyInput || buyLoading || !quoteData}
                className="h-11 w-full bg-[#00C805] text-base text-white hover:bg-[#00b805]"
              >
                {buyLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buying...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Buy
                  </>
                )}
              </Button>

              {/* Buy Error */}
              {buyError && (
                <p className="mt-3 text-xs font-medium text-[#FF4444]">
                  {buyError}
                </p>
              )}

              {/* Buy Success */}
              {buySuccess && (
                <p className="mt-3 text-xs font-medium text-[#00C805]">
                  Purchase successful!
                  {balance !== null &&
                    ` New balance: ${formatCurrency(balance)} ABX`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
