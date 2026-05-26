import { NextRequest, NextResponse } from "next/server";
import { cache, TTL } from "@/lib/cache";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

type Range = "1D" | "1M" | "1Y" | "5Y";

const RANGE_MAP: Record<Range, { yahooRange: string; interval: string }> = {
  "1D": { yahooRange: "1d", interval: "5m" },
  "1M": { yahooRange: "1mo", interval: "1d" },
  "1Y": { yahooRange: "1y", interval: "1d" },
  "5Y": { yahooRange: "5y", interval: "1d" },
};

/** Headers that mimic a real browser to reduce blocking likelihood. */
function buildHeaders(userAgent?: string) {
  return {
    "User-Agent":
      userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://finance.yahoo.com/",
  };
}

async function fetchCandles(
  symbol: string,
  interval: string,
  yahooRange: string,
  headers: Record<string, string>,
) {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${yahooRange}`;
  const response = await fetch(url, { headers });

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();
    const range = (searchParams.get("range") ?? "1D") as Range;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol query parameter is required" },
        { status: 400 },
      );
    }

    if (!(range in RANGE_MAP)) {
      return NextResponse.json(
        { error: "Range must be one of: 1D, 1M, 1Y, 5Y" },
        { status: 400 },
      );
    }

    const config = RANGE_MAP[range];
    const cacheKey = `candles:${symbol}:${range}`;

    // Check cache first
    const cached = cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Single request — no retry
    const response = await fetchCandles(
      symbol,
      config.interval,
      config.yahooRange,
      buildHeaders(),
    );

    // If Yahoo returns 404, log and return no_data directly
    if (response.status === 404) {
      console.warn(`Yahoo Finance returned 404 for ${symbol}, no data available`);
      const result = {
        timestamps: [],
        closes: [],
        status: "no_data",
      };
      cache.set(cacheKey, result, TTL.CANDLES);
      return NextResponse.json(result);
    }

    // Log request details and response status in dev mode
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Yahoo Finance candles request for ${symbol}: status=${response.status}, url=${response.url}`,
      );
    }

    if (!response.ok) {
      const result = {
        timestamps: [],
        closes: [],
        status: "no_data",
      };
      cache.set(cacheKey, result, TTL.CANDLES);
      return NextResponse.json(result);
    }

    const json = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log(
        "Yahoo Finance candles response:",
        JSON.stringify(json, null, 2),
      );
    }

    const result = json?.chart?.result?.[0];
    const error = json?.chart?.error;

    if (!result || error) {
      const noData = {
        timestamps: [],
        closes: [],
        status: "no_data",
      };
      cache.set(cacheKey, noData, TTL.CANDLES);
      return NextResponse.json(noData);
    }

    const timestamps: number[] = result.timestamp ?? [];
    const closes: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];

    // Pair and filter out nulls (Yahoo returns null for holidays/weekends)
    const paired: { t: number; c: number }[] = [];
    for (let i = 0; i < Math.min(timestamps.length, closes.length); i++) {
      if (timestamps[i] != null && closes[i] != null) {
        paired.push({ t: timestamps[i], c: closes[i] as number });
      }
    }

    if (paired.length === 0) {
      const noData = {
        timestamps: [],
        closes: [],
        status: "no_data",
      };
      cache.set(cacheKey, noData, TTL.CANDLES);
      return NextResponse.json(noData);
    }

    const resultData = {
      timestamps: paired.map((p) => p.t),
      closes: paired.map((p) => p.c),
      status: "ok",
    };

    // Cache the result
    cache.set(cacheKey, resultData, TTL.CANDLES);

    return NextResponse.json(resultData);
  } catch (error) {
    console.error("Stock candles error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch price history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
