import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { StockDetailClient } from "./stock-detail-client";

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
  let quote: Record<string, unknown> | null = null;
  let quoteError: string | null = null;

  if (quoteRes.ok) {
    quote = await quoteRes.json();
    if (quote && "error" in quote) {
      quoteError = quote.error as string;
      quote = null;
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
  let candles: Record<string, unknown> | null = null;
  if (candleRes.ok) {
    candles = await candleRes.json();
  }

  // ── Price fallback from candles ────────────────────────
  // If the quote API failed but candles have data, derive a fallback quote
  // from the last candle close so the buy panel always works.
  if (
    !quote &&
    candles &&
    candles.status !== "no_data" &&
    Array.isArray(candles.closes) &&
    (candles.closes as number[]).length > 0
  ) {
    const closes = candles.closes as number[];
    const lastClose = closes[closes.length - 1];
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

  return (
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
    />
  );
}
