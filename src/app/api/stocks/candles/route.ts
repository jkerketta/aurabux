import { NextRequest, NextResponse } from "next/server";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

type Range = "1D" | "1M" | "1Y" | "ALL";

const RANGE_MAP: Record<Range, { yahooRange: string; interval: string }> = {
  "1D": { yahooRange: "1d", interval: "5m" },
  "1M": { yahooRange: "1mo", interval: "1d" },
  "1Y": { yahooRange: "1y", interval: "1d" },
  ALL: { yahooRange: "5y", interval: "1d" },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();
    const range = (searchParams.get("range") ?? "1M") as Range;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol query parameter is required" },
        { status: 400 }
      );
    }

    if (!(range in RANGE_MAP)) {
      return NextResponse.json(
        { error: "Range must be one of: 1D, 1M, 1Y, ALL" },
        { status: 400 }
      );
    }

    const config = RANGE_MAP[range];
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${config.interval}&range=${config.yahooRange}`;
    const response = await fetch(url, {
      headers: {
        // Mimic a browser to avoid bare-minimum blocking
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API responded with ${response.status}`);
    }

    const json = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("Yahoo Finance candles response:", JSON.stringify(json, null, 2));
    }

    const result = json?.chart?.result?.[0];
    const error = json?.chart?.error;

    if (!result || error) {
      return NextResponse.json({
        timestamps: [],
        closes: [],
        status: "no_data",
      });
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
      return NextResponse.json({
        timestamps: [],
        closes: [],
        status: "no_data",
      });
    }

    return NextResponse.json({
      timestamps: paired.map((p) => p.t),
      closes: paired.map((p) => p.c),
      status: "ok",
    });
  } catch (error) {
    console.error("Stock candles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
