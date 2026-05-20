import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const YAHOO_QUOTE_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";

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

// ─── Yahoo Finance Quote endpoint ────────────────────────────────────

interface YahooQuoteResult {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
}

interface YahooQuoteResponse {
  quoteResponse: {
    result: YahooQuoteResult[];
    error: unknown;
  };
}

function buildYahooHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://finance.yahoo.com/",
  };
}

async function fetchYahooQuote(symbol: string) {
  try {
    const url = `${YAHOO_QUOTE_BASE}?symbols=${encodeURIComponent(symbol)}`;
    const response = await fetch(url, { headers: buildYahooHeaders() });

    if (!response.ok) {
      return null;
    }

    const json: YahooQuoteResponse = await response.json();
    const result = json?.quoteResponse?.result?.[0];

    if (!result) {
      return null;
    }

    return {
      symbol,
      currentPrice: result.regularMarketPrice,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      high: result.regularMarketDayHigh ?? 0,
      low: result.regularMarketDayLow ?? 0,
      open: result.regularMarketOpen ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchQuote(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY;

  // Try Finnhub first
  if (apiKey) {
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const response = await fetch(url);

    // 403 = free tier limitation for non-US stocks → fallback to Yahoo
    if (response.status === 403) {
      return fetchYahooQuote(symbol);
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
    if (data.c !== undefined && data.c !== null && data.c !== 0) {
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

    // c === 0 means no data on Finnhub → try Yahoo fallback
    return fetchYahooQuote(symbol);
  }

  // No API key → try Yahoo directly
  return fetchYahooQuote(symbol);
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
          error: `No quote data found for symbol: ${symbol}. We tried multiple data sources.`,
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
