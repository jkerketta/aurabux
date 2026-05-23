import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const RESET_HOUR_UTC = 21;

// Get the START of the current spin cycle (last reset time)
function getLastReset() {
  const now = new Date();
  const todayReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC, 0, 0));
  if (now < todayReset) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, RESET_HOUR_UTC, 0, 0));
  }
  return todayReset;
}

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

// POST /api/spin/activate — activate x2 returns powerup
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user has an unclaimed x2 spin in the current cycle
    const lastReset = getLastReset();
    const { data: x2Spin } = await supabase
      .from("daily_spins")
      .select("id")
      .eq("user_id", user.id)
      .eq("reward_type", "powerup_x2")
      .gte("created_at", lastReset.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!x2Spin) {
      return NextResponse.json(
        { error: "No x2 spin available to activate" },
        { status: 400 }
      );
    }

    // Check not already activated in current cycle (only unclaimed blocks)
    const { data: existing } = await supabase
      .from("powerups")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "x2_returns")
      .eq("claimed", false)
      .gte("activated_at", lastReset.toISOString())
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "x2 Returns already activated today" },
        { status: 400 }
      );
    }

    // Snapshot current investments value
    const headersList = await import("next/headers");
    const host = (await headersList.headers()).get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const snapshotValue = await getInvestmentsValue(user.id, baseUrl);

    // Create the powerup with snapshot
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const adminSupabase = createAdminClient();

    const { error: insertError } = await adminSupabase.from("powerups").insert({
      user_id: user.id,
      type: "x2_returns",
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      claimed: false,
      snapshot_value: snapshotValue,
    });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, snapshotValue });
  } catch (error) {
    console.error("Spin activate error:", error);
    return NextResponse.json(
      { error: "Failed to activate powerup" },
      { status: 500 }
    );
  }
}
