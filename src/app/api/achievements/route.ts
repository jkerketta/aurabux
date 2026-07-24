import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: unlockedRows } = await supabase
      .from("user_achievements")
      .select("achievement_key, unlocked_at")
      .eq("user_id", user.id);

    const unlockedMap = new Map(
      (unlockedRows ?? []).map((r: { achievement_key: string; unlocked_at: string }) => [r.achievement_key, r.unlocked_at])
    );

    const achievements = ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.key),
      unlocked_at: unlockedMap.get(a.key) ?? null,
    }));

    return NextResponse.json({ achievements });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
