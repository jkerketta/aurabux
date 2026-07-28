import { NextRequest, NextResponse } from "next/server";
import { cache, TTL } from "@/lib/cache";

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

    // Check cache first
    const cached = cache.get<Record<string, unknown>>(`profile:${symbol}`);
    if (cached) {
      return NextResponse.json(cached);
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
      const result = { marketCap: null, exchange: null, weburl: null };
      cache.set(`profile:${symbol}`, result, TTL.PROFILE);
      return NextResponse.json(result);
    }

    if (!response.ok) {
      throw new Error(`Finnhub API responded with ${response.status}`);
    }

    const data: FinnhubProfileResponse = await response.json();

    // Finnhub returns an empty object for unknown symbols
    if (!data || Object.keys(data).length === 0) {
      const result = { marketCap: null, exchange: null, weburl: null };
      cache.set(`profile:${symbol}`, result, TTL.PROFILE);
      return NextResponse.json(result);
    }

    const result = {
      marketCap: data.marketCapitalization ? data.marketCapitalization * 1_000_000 : null,
      exchange: data.exchange ?? null,
      weburl: data.weburl ?? null,
      logo: data.logo ?? null,
    };

    // Cache the result
    cache.set(`profile:${symbol}`, result, TTL.PROFILE);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch company profile" },
      { status: 500 },
    );
  }
}
