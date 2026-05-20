import { NextRequest, NextResponse } from "next/server";

const YAHOO_BASE_V7 = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_BASE_V8 = "https://query1.finance.yahoo.com/v8/finance/chart";

/** Shared headers that mimic a real browser request. */
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

// ─── V7 Quote endpoint ────────────────────────────────────────────────

async function fetchQuoteV7(symbol: string) {
  const url = `${YAHOO_BASE_V7}?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    throw new Error(`Yahoo Finance v7 responded with ${response.status}`);
  }

  const data = await response.json();

  // Dev-mode logging to inspect response shape
  console.log("Yahoo quote response:", JSON.stringify(data, null, 2));

  const result = data?.quoteResponse?.result?.[0];

  if (!result) {
    return null;
  }

  const currentPrice = result.regularMarketPrice;

  if (currentPrice === undefined || currentPrice === null) {
    return null;
  }

  return {
    symbol,
    currentPrice,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
    high: result.regularMarketDayHigh ?? 0,
    low: result.regularMarketDayLow ?? 0,
    open: result.regularMarketOpen ?? 0,
    previousClose: result.regularMarketPreviousClose ?? 0,
  };
}

// ─── V8 Chart fallback (extracts last close price) ────────────────────

async function fetchQuoteV8(symbol: string) {
  const url = `${YAHOO_BASE_V8}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    throw new Error(`Yahoo Finance v8 responded with ${response.status}`);
  }

  const data = await response.json();

  // Dev-mode logging for v8 fallback as well
  console.log("Yahoo v8 chart response:", JSON.stringify(data, null, 2));

  const result = data?.chart?.result?.[0];
  if (!result) {
    return null;
  }

  const meta = result.meta;
  const closes = result.indicators?.quote?.[0]?.close;
  const lastClose =
    closes?.[closes.length - 1] ?? meta?.regularMarketPrice ?? null;

  if (lastClose === undefined || lastClose === null) {
    return null;
  }

  return {
    symbol,
    currentPrice: lastClose,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    open: 0,
    previousClose: 0,
  };
}

// ─── Route handler ────────────────────────────────────────────────────

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

    // Attempt v7 first
    let quote = await fetchQuoteV7(symbol);

    // Fallback to v8 chart endpoint when v7 returns no data
    if (!quote) {
      console.log(`v7 returned no data for ${symbol}, trying v8 fallback...`);
      quote = await fetchQuoteV8(symbol);
    }

    if (!quote) {
      return NextResponse.json(
        { error: `No quote data found for symbol: ${symbol}` },
        { status: 404 },
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Stock quote error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock quote" },
      { status: 500 },
    );
  }
}
