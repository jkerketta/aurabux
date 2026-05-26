import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Calculate current investments value for a user
async function getInvestmentsValue(userId: string, baseUrl: string): Promise<number> {
  const supabase = await createClient();
  const { data: holdings } = await supabase
    .from("holdings")
    .select("ticker, shares, avg_buy_price")
    .eq("user_id", userId);

  if (!holdings || holdings.length === 0) return 0;

  const pricePromises = holdings.map(async (h) => {
    try {
      const res = await fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(h.ticker)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return Number(data.currentPrice) ?? Number(h.avg_buy_price);
      }
    } catch {}
    return Number(h.avg_buy_price);
  });

  const prices = await Promise.all(pricePromises);
  return holdings.reduce((sum, h, i) => sum + Number(h.shares) * prices[i], 0);
}

// POST /api/spin/claim — claim expired x2 returns powerup
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find expired unclaimed powerup
    const { data: expiredPowerup } = await supabase
      .from("powerups")
      .select("id, snapshot_value, activated_at, expires_at")
      .eq("user_id", user.id)
      .eq("type", "x2_returns")
      .eq("claimed", false)
      .lt("expires_at", now.toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!expiredPowerup) {
      return NextResponse.json(
        { error: "No expired powerup to claim" },
        { status: 400 }
      );
    }

    // Get current investments value
    const headersList = await import("next/headers");
    const host = (await headersList.headers()).get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const currentValue = await getInvestmentsValue(user.id, baseUrl);
    const snapshotValue = Number(expiredPowerup.snapshot_value ?? 0);

    // Calculate: doubled gain = (current - snapshot) * 2
    // Extra to credit/deduct = current - snapshot (the "doubled" portion)
    const gain = currentValue - snapshotValue;
    const extraAmount = gain; // This is the extra that gets added (or subtracted if negative)

    const adminSupabase = createAdminClient();

    // Update ABX balance
    const { data: currentPortfolio } = await adminSupabase
      .from("portfolios")
      .select("abx_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentBalance = Number(currentPortfolio?.abx_balance ?? 10000);
    const newBalance = currentBalance + extraAmount;

    const { error: updateError } = await adminSupabase
      .from("portfolios")
      .update({ abx_balance: newBalance })
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Mark powerup as claimed
    const { error: claimError } = await adminSupabase
      .from("powerups")
      .update({ claimed: true })
      .eq("id", expiredPowerup.id);

    if (claimError) throw claimError;

    const gainPercent = snapshotValue > 0 ? (gain / snapshotValue) * 100 : 0;
    const doubledGain = gain * 2;
    const doubledPercent = snapshotValue > 0 ? (doubledGain / snapshotValue) * 100 : 0;

    return NextResponse.json({
      snapshotValue,
      currentValue,
      gain,
      gainPercent,
      doubledGain,
      doubledPercent,
      extraAmount,
      newBalance,
    });
  } catch (error) {
    console.error("Spin claim error:", error);
    return NextResponse.json(
      { error: "Failed to claim powerup" },
      { status: 500 }
    );
  }
}
