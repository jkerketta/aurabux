import { NextRequest, NextResponse } from "next/server";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubProfileResponse {
  country?: string;
  currency?: string;
  exchange?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
}

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

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Finnhub API key not configured" },
        { status: 500 },
      );
    }

    const url = `${FINNHUB_BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const response = await fetch(url);

    // 403 = free tier limitation, 404 = symbol not found → return null
    if (response.status === 403 || response.status === 404) {
      return NextResponse.json({ marketCap: null, exchange: null, weburl: null });
    }

    if (!response.ok) {
      throw new Error(`Finnhub API responded with ${response.status}`);
    }

    const data: FinnhubProfileResponse = await response.json();

    // Finnhub returns an empty object for unknown symbols
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ marketCap: null, exchange: null, weburl: null });
    }

    return NextResponse.json({
      marketCap: data.marketCapitalization ?? null,
      exchange: data.exchange ?? null,
      weburl: data.weburl ?? null,
    });
  } catch (error) {
    console.error("Stock profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company profile" },
      { status: 500 },
    );
  }
}
