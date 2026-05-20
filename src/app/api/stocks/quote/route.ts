import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

// ─── Finnhub Quote endpoint ──────────────────────────────────────────

interface FinnhubQuoteResponse {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

async function fetchQuote(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not configured");
  }

  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const response = await fetch(url);

  // Handle specific HTTP status codes
  if (response.status === 403) {
    throw new Error(
      "Finnhub API authentication failed. Check your FINNHUB_API_KEY.",
    );
  }

  if (response.status === 404) {
    return null; // symbol not found
  }

  if (!response.ok) {
    throw new Error(`Finnhub API responded with ${response.status}`);
  }

  const data: FinnhubQuoteResponse = await response.json();

  // Finnhub returns an empty object or missing fields for unknown symbols
  // The `c` field is 0 when no data is available (or symbol is invalid)
  if (data.c === undefined || data.c === null || data.c === 0) {
    return null;
  }

  return {
    symbol,
    currentPrice: data.c,
    change: data.d ?? 0,
    changePercent: data.dp ?? 0,
    high: data.h ?? 0,
    low: data.l ?? 0,
    open: data.o ?? 0,
    previousClose: data.pc ?? 0,
  };
}

// ─── Route handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol query parameter is required" },
        { status: 400 },
      );
    }

    const quote = await fetchQuote(symbol);

    if (!quote) {
      return NextResponse.json(
        {
          error: `No quote data found for symbol: ${symbol}. Finnhub free tier supports US stocks and major international exchanges.`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Stock quote error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch stock quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
