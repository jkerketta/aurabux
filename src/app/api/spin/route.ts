import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getSpinStatus, getTodayReset, getNextReset } from "@/lib/spin";

// Daily reset at 21:00 UTC (4 PM EST / 5 PM EDT)
const RESET_HOUR_UTC = 21;

const REWARDS = [
  { type: "abx", value: "500", label: "500 ABX" },
  { type: "abx", value: "1000", label: "1000 ABX" },
  { type: "abx", value: "2500", label: "2500 ABX" },
  { type: "abx", value: "5000", label: "5000 ABX" },
  { type: "abx", value: "10000", label: "10000 ABX" },
  { type: "stock", value: "RANDOM", label: "3 Free Shares" },
  { type: "powerup_x2", value: "x2", label: "x2 Returns Today" },
  { type: "free_spins", value: "2", label: "2 Free Spins" },
];

const STOCK_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA"];

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getSpinStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Spin status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch spin status" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayReset = getTodayReset();
    const nextReset = getNextReset();
    const now = new Date();

    // Get current state
    const { data: lastSpin } = await supabase
      .from("daily_spins")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: portfolio } = await supabase
      .from("portfolios")
      .select("free_spins")
      .eq("user_id", user.id)
      .maybeSingle();

    const freeSpins = portfolio?.free_spins ?? 0;
    const hasFreeSpins = freeSpins > 0;

    // Check cooldown (bypassed if user has free spins)
    if (!hasFreeSpins && lastSpin && new Date(lastSpin.created_at) >= todayReset) {
      return NextResponse.json(
        { error: "Spin on cooldown", nextResetAt: nextReset.toISOString() },
        { status: 400 }
      );
    }

    // Build reward pool — exclude "2 Free Spins" if already won today
    const { data: wonFreeSpinsToday } = await supabase
      .from("daily_spins")
      .select("id")
      .eq("user_id", user.id)
      .eq("reward_type", "free_spins")
      .gte("created_at", todayReset.toISOString())
      .limit(1)
      .maybeSingle();

    // Exclude x2 from pool if user already has an active (non-expired) powerup
    const { data: activeX2 } = await supabase
      .from("powerups")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "x2_returns")
      .eq("claimed", false)
      .gt("expires_at", now.toISOString())
      .limit(1)
      .maybeSingle();

    let rewardPool = REWARDS;
    if (wonFreeSpinsToday) {
      rewardPool = rewardPool.filter((r) => r.type !== "free_spins");
    }
    if (activeX2) {
      rewardPool = rewardPool.filter((r) => r.type !== "powerup_x2");
    }

    // Pick equal random reward
    const randomIndex = Math.floor(Math.random() * rewardPool.length);
    const reward = { ...rewardPool[randomIndex] };
    const adminSupabase = createAdminClient();

    // Apply reward FIRST — only record the spin after reward succeeds
    if (reward.type === "abx") {
      const { data: currentPortfolio } = await adminSupabase
        .from("portfolios")
        .select("abx_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentBalance = Number(currentPortfolio?.abx_balance ?? 10000);
      const newBalance = currentBalance + Number(reward.value);

      const { error: updateError } = await adminSupabase
        .from("portfolios")
        .update({ abx_balance: newBalance })
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else if (reward.type === "stock") {
      const ticker = STOCK_TICKERS[Math.floor(Math.random() * STOCK_TICKERS.length)];

      // Fetch current price to use as avg_buy_price (so P&L starts at 0)
      const headersList = await import("next/headers");
      const host = (await headersList.headers()).get("host") ?? "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;

      let currentPrice = 0;
      try {
        const quoteRes = await fetch(`${baseUrl}/api/stocks/quote?symbol=${ticker}`, { cache: "no-store" });
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          currentPrice = Number(quoteData.currentPrice) || 0;
        }
      } catch {
        // fallback to 0
      }

      // Upsert holding: handle existing holdings to avoid duplicate key error
      const { data: existingHolding } = await adminSupabase
        .from("holdings")
        .select("shares, avg_buy_price")
        .eq("user_id", user.id)
        .eq("ticker", ticker)
        .maybeSingle();

      if (existingHolding) {
        const oldShares = Number(existingHolding.shares);
        const oldAvg = Number(existingHolding.avg_buy_price);
        const totalShares = oldShares + 3;
        const newAvg = (oldShares * oldAvg + 3 * currentPrice) / totalShares;

        const { error: updateError } = await adminSupabase
          .from("holdings")
          .update({ shares: totalShares, avg_buy_price: Math.round(newAvg * 100) / 100 })
          .eq("user_id", user.id)
          .eq("ticker", ticker);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await adminSupabase.from("holdings").insert({
          user_id: user.id,
          ticker,
          shares: 3,
          avg_buy_price: Math.round(currentPrice * 100) / 100,
        });

        if (insertError) throw insertError;
      }

      // Increment total_invested so free stocks don't inflate return %
      const { data: currentPortfolio } = await adminSupabase
        .from("portfolios")
        .select("total_invested")
        .eq("user_id", user.id)
        .maybeSingle();

      const currentTotalInvested = Number(currentPortfolio?.total_invested ?? 0);
      const { error: investError } = await adminSupabase
        .from("portfolios")
        .update({ total_invested: currentTotalInvested + Math.round(3 * currentPrice * 100) / 100 })
        .eq("user_id", user.id);

      if (investError) throw investError;

      // Record transaction so it shows up in recent history
      const { error: txnError } = await adminSupabase.from("transactions").insert({
        user_id: user.id,
        ticker,
        type: "spin",
        shares: 3,
        price_per_share: Math.round(currentPrice * 100) / 100,
      });

      if (txnError) throw txnError;

      reward.value = ticker;
      reward.label = `3 Shares ${ticker}`;
    } else if (reward.type === "free_spins") {
      // Grant 2 free spins
      const { error: updateError } = await adminSupabase
        .from("portfolios")
        .update({ free_spins: freeSpins + 2 })
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    }
    // powerup_x2: do NOT auto-insert. User must activate via /api/spin/activate.

    // Record the spin AFTER reward succeeds
    const { error: spinError } = await adminSupabase.from("daily_spins").insert({
      user_id: user.id,
      reward_type: reward.type,
      reward_value: reward.value,
    });

    if (spinError) throw spinError;

    // Decrement free spins if used
    if (hasFreeSpins) {
      const { error: updateError } = await adminSupabase
        .from("portfolios")
        .update({ free_spins: freeSpins - 1 })
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    }

    // Get updated free spins count
    const { data: updatedPortfolio } = await adminSupabase
      .from("portfolios")
      .select("free_spins")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      reward: { type: reward.type, value: reward.value, label: reward.label },
      canSpin: false,
      nextResetAt: nextReset.toISOString(),
      freeSpinsRemaining: updatedPortfolio?.free_spins ?? 0,
    });
  } catch (error) {
    console.error("Spin error:", error);
    return NextResponse.json(
      { error: "Failed to process spin" },
      { status: 500 }
    );
  }
}
