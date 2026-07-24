import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { StockDetailClient } from "./stock-detail-client";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface Props {
  params: Promise<{ symbol: string }>;
}

export default async function StockDetailPage({ params }: Props) {
  const { symbol } = await params;
  const symbolUpper = symbol.toUpperCase();

  // Build the base URL so we can call internal API routes from the server
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol =
    host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const encoded = encodeURIComponent(symbolUpper);

  // ── Supabase data ──────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let availableBalance = 10000;
  let userHolding: { shares: number; avg_buy_price: number } | null = null;
  let portfolioTotalValue = 10000;

  if (user) {
    const [portfolioResult, holdingResult, allHoldingsResult] =
      await Promise.all([
        supabase
          .from("portfolios")
          .select("abx_balance")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("holdings")
          .select("shares, avg_buy_price")
          .eq("user_id", user.id)
          .eq("ticker", symbolUpper)
          .maybeSingle(),
        supabase
          .from("holdings")
          .select("ticker, shares, avg_buy_price")
          .eq("user_id", user.id),
      ]);

    const balance = Number(portfolioResult.data?.abx_balance ?? 10000);
    availableBalance = balance;

    if (holdingResult.data) {
      userHolding = {
        shares: Number(holdingResult.data.shares),
        avg_buy_price: Number(holdingResult.data.avg_buy_price),
      };
    }

    // Approximate total portfolio value using cost basis
    const holdingsCostBasis = (allHoldingsResult.data ?? []).reduce(
      (sum: number, h: { shares: unknown; avg_buy_price: unknown }) =>
        sum + Number(h.shares) * Number(h.avg_buy_price),
      0,
    );
    portfolioTotalValue = balance + holdingsCostBasis;

    // Fetch live prices for all holdings to calculate accurate total value
    if (allHoldingsResult.data && allHoldingsResult.data.length > 0) {
      const pricePromises = allHoldingsResult.data.map(async (h: { ticker: string; shares: number; avg_buy_price: number }) => {
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
      const holdingsValue = allHoldingsResult.data.reduce(
        (sum: number, h: { shares: number; avg_buy_price: number }, i: number) =>
          sum + Number(h.shares) * prices[i],
        0
      );

      portfolioTotalValue = balance + holdingsValue;
    }
  }

  const [quoteRes, candleRes, searchRes, profileRes] = await Promise.all([
    fetch(`${baseUrl}/api/stocks/quote?symbol=${encoded}`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/stocks/candles?symbol=${encoded}&range=1D`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/stocks/search?q=${encoded}`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/stocks/profile?symbol=${encoded}`, {
      cache: "no-store",
    }),
  ]);

  // ── Quote ──────────────────────────────────────────────
  let quote: {
    symbol: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
  } | null = null;
  let quoteError: string | null = null;

  if (quoteRes.ok) {
    const rawQuote: Record<string, unknown> = await quoteRes.json();
    if (rawQuote && "error" in rawQuote) {
      quoteError = rawQuote.error as string;
    } else if (
      typeof rawQuote.currentPrice === "number" &&
      typeof rawQuote.change === "number"
    ) {
      quote = {
        symbol: String(rawQuote.symbol ?? symbolUpper),
        currentPrice: rawQuote.currentPrice as number,
        change: rawQuote.change as number,
        changePercent: rawQuote.changePercent as number,
        high: rawQuote.high as number,
        low: rawQuote.low as number,
        open: rawQuote.open as number,
        previousClose: rawQuote.previousClose as number,
      };
    }
  } else {
    try {
      const err = await quoteRes.json();
      quoteError = (err as { error?: string }).error ?? "Failed to fetch quote";
    } catch {
      quoteError = "Failed to fetch quote";
    }
  }

  // ── Candles ────────────────────────────────────────────
  let candles: {
    timestamps: number[];
    closes: number[];
    status: string;
  } | null = null;
  if (candleRes.ok) {
    const rawCandles: Record<string, unknown> = await candleRes.json();
    if (
      Array.isArray(rawCandles.timestamps) &&
      Array.isArray(rawCandles.closes) &&
      typeof rawCandles.status === "string"
    ) {
      candles = {
        timestamps: rawCandles.timestamps as number[],
        closes: rawCandles.closes as number[],
        status: rawCandles.status as string,
      };
    }
  }

  // ── Price fallback from candles ────────────────────────
  // If the quote API failed but candles have data, derive a fallback quote
  // from the last candle close so the buy panel always works.
  if (
    !quote &&
    candles &&
    candles.status !== "no_data" &&
    candles.closes.length > 0
  ) {
    const lastClose = candles.closes[candles.closes.length - 1];
    quote = {
      symbol: symbolUpper,
      currentPrice: lastClose,
      change: 0,
      changePercent: 0,
      high: lastClose,
      low: lastClose,
      open: lastClose,
      previousClose: lastClose,
    };
  }

  // ── Company name ───────────────────────────────────────
  let companyName = symbolUpper;
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as {
      results?: { description?: string }[];
    };
    if (searchData.results && searchData.results.length > 0) {
      companyName = searchData.results[0].description || symbolUpper;
    }
  }

  // ── Company profile ────────────────────────────────────
  let companyInfo: {
    marketCap: number | null;
    exchange: string | null;
    weburl: string | null;
  } | null = null;
  if (profileRes.ok) {
    const profileData = await profileRes.json();
    if (!profileData.error) {
      companyInfo = profileData;
    }
  }

  // ── Watchlist membership ───────────────────────────────
  let isInWatchlist = false;
  try {
    const { data: watchlistRow } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user!.id)
      .eq("ticker", symbolUpper)
      .maybeSingle();
    isInWatchlist = !!watchlistRow;
  } catch {
    // fails silently
  }

  return (
    <ErrorBoundary fallbackTitle="Failed to load stock details">
      <StockDetailClient
        symbol={symbolUpper}
        companyName={companyName}
        initialQuote={quote}
        initialCandles={candles}
        quoteError={quoteError}
        availableBalance={availableBalance}
        userHolding={userHolding}
        portfolioTotalValue={portfolioTotalValue}
        companyInfo={companyInfo}
        isInWatchlist={isInWatchlist}
      />
    </ErrorBoundary>
  );
}
