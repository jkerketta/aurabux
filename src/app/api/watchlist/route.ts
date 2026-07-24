import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: watchlist } = await supabase
      .from("watchlist")
      .select("ticker, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const tickers = (watchlist ?? []).map((w: { ticker: string }) => w.ticker);

    // Fetch current prices + logos
    const host = "localhost:3000";
    const baseUrl = `http://${host}`;

    const enriched = await Promise.all(
      tickers.map(async (ticker: string) => {
        let currentPrice: number | null = null;
        let changePercent: number | null = null;
        let logo: string | null = null;
        try {
          const [quoteRes, profileRes] = await Promise.all([
            fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(ticker)}`, { cache: "no-store" }),
            fetch(`${baseUrl}/api/stocks/profile?symbol=${encodeURIComponent(ticker)}`, { cache: "no-store" }),
          ]);
          if (quoteRes.ok) {
            const qd = await quoteRes.json();
            currentPrice = qd.currentPrice != null && !isNaN(Number(qd.currentPrice)) ? Number(qd.currentPrice) : null;
            changePercent = qd.changePercent ?? null;
          }
          if (profileRes.ok) {
            const pd = await profileRes.json();
            logo = pd.logo ?? null;
          }
        } catch {
          // fallback
        }
        return { ticker, currentPrice, changePercent, logo };
      })
    );

    return NextResponse.json({ watchlist: enriched });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { ticker?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.ticker || typeof body.ticker !== "string") {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const ticker = body.ticker.trim().toUpperCase();
    if (ticker.length < 1 || ticker.length > 5) {
      return NextResponse.json({ error: "Invalid ticker symbol" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("watchlist")
      .insert({ user_id: user.id, ticker });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticker = new URL(request.url).searchParams.get("ticker")?.trim().toUpperCase();
    if (!ticker) {
      return NextResponse.json({ error: "ticker query parameter is required" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("ticker", ticker);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
