import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetId } = await params;

    // Verify accepted friendship
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`
      )
      .eq("status", "accepted")
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch friend's data
    const [userResult, portfolioResult, holdingsResult, achievementsResult] = await Promise.all([
      admin.from("users").select("username, display_number").eq("id", targetId).single(),
      admin.from("portfolios").select("abx_balance, total_invested").eq("user_id", targetId).single(),
      admin.from("holdings").select("ticker, shares, avg_buy_price").eq("user_id", targetId).order("ticker"),
      admin.from("user_achievements")
        .select("achievement_key")
        .eq("user_id", targetId)
        .order("unlocked_at", { ascending: false })
        .limit(5),
    ]);

    const friendUser = userResult.data as { username: string; display_number: string | null } | null;
    const friendPortfolio = portfolioResult.data as { abx_balance: number; total_invested: number } | null;
    const friendHoldings = (holdingsResult.data ?? []) as { ticker: string; shares: number; avg_buy_price: number }[];
    const friendAchievements = (achievementsResult.data ?? []) as { achievement_key: string }[];

    if (!friendUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const balance = Number(friendPortfolio?.abx_balance ?? 0);

    // Fetch live prices + logos for friend's holdings
    const host = _request.headers.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const enrichedHoldings = await Promise.all(
      friendHoldings.map(async (h) => {
        let currentPrice = Number(h.avg_buy_price);
        let logo: string | null = null;
        try {
          const [quoteRes, profileRes] = await Promise.all([
            fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(h.ticker)}`, { cache: "no-store" }),
            fetch(`${baseUrl}/api/stocks/profile?symbol=${encodeURIComponent(h.ticker)}`, { cache: "no-store" }),
          ]);
          if (quoteRes.ok) {
            const qd = await quoteRes.json();
            currentPrice = qd.currentPrice != null && !isNaN(Number(qd.currentPrice)) ? Number(qd.currentPrice) : currentPrice;
          }
          if (profileRes.ok) {
            const pd = await profileRes.json();
            logo = pd.logo ?? null;
          }
        } catch {
          // fallback
        }
        return {
          ticker: h.ticker,
          shares: Number(h.shares),
          avg_buy_price: Number(h.avg_buy_price),
          current_price: currentPrice,
          logo,
        };
      })
    );

    const totalValue = balance + enrichedHoldings.reduce((sum, h) => sum + h.shares * h.current_price, 0);

    return NextResponse.json({
      username: friendUser.username,
      display_number: friendUser.display_number,
      balance,
      total_value: Math.round(totalValue * 100) / 100,
      holdings: enrichedHoldings,
      achievements: friendAchievements.map((a) => a.achievement_key),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch friend portfolio" },
      { status: 500 }
    );
  }
}
