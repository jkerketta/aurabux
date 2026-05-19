"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────

interface SearchResult {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

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

// ─── Component ───────────────────────────────────────────────────────

export default function SearchPage() {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Selected stock state
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [candleData, setCandleData] = useState<CandleData | null>(null);
  const [chartRange, setChartRange] = useState<"1M" | "1Y" | "ALL">("1M");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [candleLoading, setCandleLoading] = useState(false);

  // Buy state
  const [buyMode, setBuyMode] = useState<"shares" | "abx">("shares");
  const [buyInput, setBuyInput] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Fetch quote data when a stock is selected
  const fetchQuote = useCallback(async (symbol: string) => {
    setQuoteLoading(true);
    setQuoteData(null);
    try {
      const res = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`);
      const data = await res.json();
      if (data.error) {
        setQuoteData(null);
      } else {
        setQuoteData(data);
      }
    } catch {
      setQuoteData(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  // Fetch candle data when stock or range changes
  const fetchCandles = useCallback(async (symbol: string, range: "1M" | "1Y" | "ALL") => {
    setCandleLoading(true);
    setCandleData(null);
    try {
      const res = await fetch(
        `/api/stocks/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`
      );
      const data = await res.json();
      if (data.status === "no_data" || data.error) {
        setCandleData(null);
      } else {
        setCandleData(data);
      }
    } catch {
      setCandleData(null);
    } finally {
      setCandleLoading(false);
    }
  }, []);

  // Handle stock selection
  const handleSelectStock = useCallback(
    (symbol: string) => {
      if (selectedStock === symbol) {
        // Deselect
        setSelectedStock(null);
        setQuoteData(null);
        setCandleData(null);
        setBuyInput("");
        setBuyError(null);
        setBuySuccess(false);
        return;
      }

      setSelectedStock(symbol);
      setBuyInput("");
      setBuyError(null);
      setBuySuccess(false);
      setChartRange("1M");
      fetchQuote(symbol);
      fetchCandles(symbol, "1M");
    },
    [selectedStock, fetchQuote, fetchCandles]
  );

  // Handle chart range change
  const handleRangeChange = useCallback(
    (range: "1M" | "1Y" | "ALL") => {
      setChartRange(range);
      if (selectedStock) {
        fetchCandles(selectedStock, range);
      }
    },
    [selectedStock, fetchCandles]
  );

  // Handle buy
  const handleBuy = useCallback(async () => {
    if (!selectedStock || !quoteData || !buyInput) return;

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
          symbol: selectedStock,
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
  }, [selectedStock, quoteData, buyInput, buyMode]);

  // Build chart data
  const chartData: ChartPoint[] =
    candleData?.timestamps.map((t, i) => ({
      date: formatDate(t),
      price: candleData.closes[i],
    })) ?? [];

  const isUp = quoteData ? quoteData.change >= 0 : true;
  const chartColor = isUp ? "#00C805" : "#FF4444";

  const currentPrice = quoteData?.currentPrice ?? 0;
  const computedShares = buyMode === "abx" && buyInput
    ? parseFloat(buyInput) / currentPrice
    : 0;
  const computedCost = buyMode === "shares" && buyInput
    ? parseFloat(buyInput) * currentPrice
    : 0;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page title */}
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-black">
        Search Stocks
      </h1>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stocks..."
          className="h-12 pl-10 text-base"
        />
        {searchLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence mode="popLayout">
        {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
          <motion.p
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No stocks found for &ldquo;{searchQuery}&rdquo;
          </motion.p>
        )}

        {searchResults.map((result) => {
          const isSelected = selectedStock === result.symbol;
          return (
            <motion.div
              key={result.symbol}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Result Card */}
              <Card
                className={cn(
                  "mb-2 cursor-pointer transition-colors hover:bg-neutral-50",
                  isSelected && "border-black"
                )}
                onClick={() => handleSelectStock(result.symbol)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-black">
                        {result.displaySymbol || result.symbol}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {result.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Detail */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    key={`detail-${result.symbol}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <Card className="mb-4 border-t-0 rounded-t-none">
                      <CardContent className="p-6 pt-4">
                        {/* Header Row */}
                        <div className="mb-6 flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-black">
                              {result.displaySymbol || result.symbol}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {result.description}
                            </p>
                          </div>

                          {quoteLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
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
                                  {formatCurrency(quoteData.change)} ({quoteData.changePercent >= 0 ? "+" : ""}
                                  {quoteData.changePercent.toFixed(2)}%)
                                </Badge>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* Chart */}
                        <div className="mb-6">
                          <div className="mb-3 flex items-center gap-2">
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

                          <div className="h-56">
                            {candleLoading ? (
                              <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : chartData.length > 1 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                  <defs>
                                    <linearGradient id={`gradient-${result.symbol}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={chartColor} stopOpacity={0.15} />
                                      <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
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
                                    formatter={(value) => [`$${formatCurrency(Number(value))}`, "Price"]}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fill={`url(#gradient-${result.symbol})`}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No chart data available
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator className="mb-6" />

                        {/* Stock Info Grid */}
                        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                          {[
                            { label: "Open", value: quoteData ? `$${formatCurrency(quoteData.open)}` : "—" },
                            { label: "High", value: quoteData ? `$${formatCurrency(quoteData.high)}` : "—" },
                            { label: "Low", value: quoteData ? `$${formatCurrency(quoteData.low)}` : "—" },
                            { label: "Prev Close", value: quoteData ? `$${formatCurrency(quoteData.previousClose)}` : "—" },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {item.label}
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-black">
                                {quoteLoading ? "—" : item.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Separator className="mb-6" />

                        {/* Buy Panel */}
                        <div>
                          <h3 className="mb-3 text-sm font-semibold text-black">Buy {result.displaySymbol || result.symbol}</h3>

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

                          {/* Input Row */}
                          <div className="mb-3 flex items-end gap-3">
                            <div className="flex-1">
                              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                {buyMode === "shares" ? "Number of shares" : "ABX to spend"}
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step={buyMode === "shares" ? "1" : "0.01"}
                                value={buyInput}
                                onChange={(e) => {
                                  setBuyInput(e.target.value);
                                  setBuyError(null);
                                  setBuySuccess(false);
                                }}
                                placeholder={buyMode === "shares" ? "e.g. 10" : "e.g. 500"}
                                className="h-10"
                              />
                            </div>
                            <Button
                              onClick={handleBuy}
                              disabled={!buyInput || buyLoading || !quoteData}
                              className="h-10 bg-[#00C805] px-6 text-white hover:bg-[#00b805]"
                            >
                              {buyLoading ? (
                                <>
                                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                  Buying...
                                </>
                              ) : (
                                <>
                                  <DollarSign className="mr-1.5 h-4 w-4" />
                                  Buy
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Calculated values */}
                          {buyInput && quoteData && !isNaN(parseFloat(buyInput)) && (
                            <p className="mb-2 text-xs text-muted-foreground">
                              {buyMode === "shares" ? (
                                <>
                                  Total cost: <span className="font-medium text-black">{formatCurrency(computedCost)} ABX</span>
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

                          {/* Buy Error */}
                          {buyError && (
                            <p className="text-xs font-medium text-[#FF4444]">{buyError}</p>
                          )}

                          {/* Buy Success */}
                          {buySuccess && (
                            <motion.p
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs font-medium text-[#00C805]"
                            >
                              Purchase successful! {balance !== null && (
                                <>New balance: {formatCurrency(balance)} ABX</>
                              )}
                            </motion.p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
