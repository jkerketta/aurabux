import { headers } from "next/headers";
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

  const [quoteRes, candleRes, searchRes] = await Promise.all([
    fetch(`${baseUrl}/api/stocks/quote?symbol=${encoded}`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/stocks/candles?symbol=${encoded}&range=1D`, {
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/stocks/search?q=${encoded}`, {
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

  return (
    <StockDetailClient
      symbol={symbolUpper}
      companyName={companyName}
      initialQuote={quote}
      initialCandles={candles}
      quoteError={quoteError}
    />
  );
}
