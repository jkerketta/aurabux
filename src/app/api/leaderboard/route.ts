import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cache, TTL } from "@/lib/cache";

interface Holding {
  ticker: string;
  shares: number;
}

interface UserPortfolio {
  user_id: string;
  abx_balance: number;
  total_invested: number;
  holdings: Holding[];
}

async function fetchPrice(ticker: string, baseUrl: string): Promise<number> {
  const cached = cache.get<number>(`price:${ticker}`);
  if (cached !== null) return cached;

  try {
    const res = await fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(ticker)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.currentPrice) {
        cache.set(`price:${ticker}`, data.currentPrice, TTL.QUOTE);
        return data.currentPrice;
      }
    }
  } catch {
    // fall through
  }
  return 0;
}

async function calculateLeaderboard(
  portfolios: UserPortfolio[],
  baseUrl: string
) {
  // Collect unique tickers
  const uniqueTickers = new Set<string>();
  for (const p of portfolios) {
    for (const h of p.holdings) {
      uniqueTickers.add(h.ticker);
    }
  }

  // Fetch all prices in parallel
  const priceMap = new Map<string, number>();
  const pricePromises = Array.from(uniqueTickers).map(async (ticker) => {
    const price = await fetchPrice(ticker, baseUrl);
    priceMap.set(ticker, price);
  });
  await Promise.all(pricePromises);

  // Calculate total value for each user
  const results = portfolios.map((p) => {
    const holdingsValue = p.holdings.reduce(
      (sum, h) => sum + h.shares * (priceMap.get(h.ticker) ?? 0),
      0
    );
    const totalValue = Number(p.abx_balance) + holdingsValue;
    const totalInvested = Number(p.total_invested ?? 0);
    const gainLossPct = totalInvested > 0 ? ((holdingsValue - totalInvested) / totalInvested) * 100 : 0;

    return {
      user_id: p.user_id,
      total_value: Math.round(totalValue * 100) / 100,
      gain_loss_pct: Math.round(gainLossPct * 100) / 100,
    };
  });

  return results;
}

// GET /api/leaderboard/global — top 100 users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type") ?? "global";

    // Build base URL for internal API calls
    const host = request.headers.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const adminClient = createAdminClient();

    let portfolios: UserPortfolio[] = [];

    if (type === "friends") {
      // Get accepted friends
      const { data: friendships } = await adminClient
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const friendIds = new Set<string>([user.id]);
      for (const f of friendships ?? []) {
        friendIds.add(f.requester_id === user.id ? f.addressee_id : f.requester_id);
      }

      // Fetch portfolios for friends
      const { data: friendPortfolios } = await adminClient
        .from("portfolios")
        .select("user_id, abx_balance, total_invested")
        .in("user_id", Array.from(friendIds));

      // Fetch holdings for friends
      const { data: friendHoldings } = await adminClient
        .from("holdings")
        .select("user_id, ticker, shares")
        .in("user_id", Array.from(friendIds));

      const holdingsByUser = new Map<string, Holding[]>();
      for (const h of friendHoldings ?? []) {
        if (!holdingsByUser.has(h.user_id)) {
          holdingsByUser.set(h.user_id, []);
        }
        holdingsByUser.get(h.user_id)!.push({
          ticker: h.ticker,
          shares: Number(h.shares),
        });
      }

      portfolios = (friendPortfolios ?? []).map((p) => ({
        user_id: p.user_id,
        abx_balance: Number(p.abx_balance),
        total_invested: Number(p.total_invested ?? 0),
        holdings: holdingsByUser.get(p.user_id) ?? [],
      }));
    } else {
      // Global: fetch all portfolios and holdings
      const { data: allPortfolios } = await adminClient
        .from("portfolios")
        .select("user_id, abx_balance, total_invested")
        .order("abx_balance", { ascending: false })
        .limit(100);

      const { data: allHoldings } = await adminClient
        .from("holdings")
        .select("user_id, ticker, shares");

      const holdingsByUser = new Map<string, Holding[]>();
      for (const h of allHoldings ?? []) {
        if (!holdingsByUser.has(h.user_id)) {
          holdingsByUser.set(h.user_id, []);
        }
        holdingsByUser.get(h.user_id)!.push({
          ticker: h.ticker,
          shares: Number(h.shares),
        });
      }

      portfolios = (allPortfolios ?? []).map((p) => ({
        user_id: p.user_id,
        abx_balance: Number(p.abx_balance),
        total_invested: Number(p.total_invested ?? 0),
        holdings: holdingsByUser.get(p.user_id) ?? [],
      }));
    }

    // Calculate values with live prices
    const results = await calculateLeaderboard(portfolios, baseUrl);

    // Sort by total value descending
    results.sort((a, b) => b.total_value - a.total_value);

    // Fetch usernames for all users
    const userIds = results.map((r) => r.user_id);
    const { data: users } = await adminClient
      .from("users")
      .select("id, username, display_number")
      .in("id", userIds);

    const userMap = new Map<string, { username: string; display_number: string | null }>();
    for (const u of users ?? []) {
      userMap.set(u.id, { username: u.username, display_number: u.display_number });
    }

    // Build final leaderboard
    const leaderboard = results.map((r, index) => {
      const userInfo = userMap.get(r.user_id);
      return {
        rank: index + 1,
        user_id: r.user_id,
        username: userInfo?.username ?? "Unknown",
        display_number: userInfo?.display_number ?? "",
        total_value: r.total_value,
        gain_loss_pct: r.gain_loss_pct,
        is_current_user: r.user_id === user.id,
      };
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
