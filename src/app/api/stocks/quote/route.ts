import { NextRequest, NextResponse } from "next/server";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v7/finance/quote";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol")?.trim().toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol query parameter is required" },
        { status: 400 }
      );
    }

    const url = `${YAHOO_BASE}?symbols=${encodeURIComponent(symbol)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API responded with ${response.status}`);
    }

    const data = await response.json();

    const result = data?.quoteResponse?.result?.[0];

    if (!result || result.regularMarketPrice === undefined) {
      return NextResponse.json(
        { error: `No quote data found for symbol: ${symbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      symbol,
      currentPrice: result.regularMarketPrice,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      high: result.regularMarketDayHigh ?? 0,
      low: result.regularMarketDayLow ?? 0,
      open: result.regularMarketOpen ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
    });
  } catch (error) {
    console.error("Stock quote error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock quote" },
      { status: 500 }
    );
  }
}
