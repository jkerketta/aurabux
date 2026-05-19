import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

type Range = "1M" | "1Y" | "ALL";

const RANGE_CONFIG: Record<
  Range,
  { resolution: string; days: number }
> = {
  "1M": { resolution: "D", days: 30 },
  "1Y": { resolution: "W", days: 365 },
  ALL: { resolution: "M", days: 1825 }, // 5 years
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

    if (!(range in RANGE_CONFIG)) {
      return NextResponse.json(
        { error: "Range must be one of: 1M, 1Y, ALL" },
        { status: 400 }
      );
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Finnhub API key not configured" },
        { status: 500 }
      );
    }

    const config = RANGE_CONFIG[range];
    const now = Math.floor(Date.now() / 1000);
    const from = now - config.days * 24 * 60 * 60;

    const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${config.resolution}&from=${from}&to=${now}&token=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub API responded with ${response.status}`);
    }

    const data = await response.json();

    if (data.s === "no_data" || !data.t || !data.c) {
      return NextResponse.json({
        timestamps: [],
        closes: [],
        status: "no_data",
      });
    }

    return NextResponse.json({
      timestamps: data.t,
      closes: data.c,
      status: data.s,
    });
  } catch (error) {
    console.error("Stock candles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
