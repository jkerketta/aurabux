import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RANGE_MAP: Record<string, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "1y": 365,
  all: 0,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const range = new URL(request.url).searchParams.get("range") ?? "1m";
    const days = RANGE_MAP[range] ?? 30;

    let query = supabase
      .from("portfolio_snapshots")
      .select("snapshot_at, total_value")
      .eq("user_id", user.id)
      .order("snapshot_at", { ascending: true });

    if (days > 0) {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      query = query.gte("snapshot_at", since);
    }

    const { data: snapshots } = await query;

    // Fetch milestone unlocks for the user
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement_key, unlocked_at")
      .eq("user_id", user.id)
      .in("achievement_key", [
        "net_worth_15k",
        "net_worth_25k",
        "net_worth_50k",
        "net_worth_100k",
        "net_worth_250k",
      ]);

    const milestones = (achievements ?? []).map(
      (a: { achievement_key: string; unlocked_at: string }) => {
        // Parse threshold from achievement key
        const numStr = a.achievement_key.replace("net_worth_", "").replace("k", "");
        const threshold = parseInt(numStr) * 1000;
        return {
          date: a.unlocked_at.slice(0, 10),
          threshold,
          label: `$${threshold.toLocaleString()} reached`,
        };
      }
    );

    return NextResponse.json({ snapshots: snapshots ?? [], milestones });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch portfolio history" },
      { status: 500 }
    );
  }
}
