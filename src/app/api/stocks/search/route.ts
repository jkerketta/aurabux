import { NextRequest, NextResponse } from "next/server";
import { cache, TTL } from "@/lib/cache";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    // Check cache first
    const cached = cache.get<{ results: unknown[] }>(`search:${query.toLowerCase()}`);
    if (cached) {
      return NextResponse.json(cached);
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Finnhub API key not configured" },
        { status: 500 }
      );
    }

    const url = `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub API responded with ${response.status}`);
    }

    const data = await response.json();

    const results = (data.result ?? [])
      .map(
        (item: { symbol: string; description: string; displaySymbol: string; type: string }) => ({
          symbol: item.symbol,
          description: item.description,
          displaySymbol: item.displaySymbol,
          type: item.type,
        })
      )
      .filter((r: { symbol: string }) => !r.symbol.endsWith(".TO"));

    const responseData = { results };

    // Cache the result
    cache.set(`search:${query.toLowerCase()}`, responseData, TTL.SEARCH);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Stock search error:", error);
    return NextResponse.json(
      { error: "Failed to search stocks" },
      { status: 500 }
    );
  }
}
