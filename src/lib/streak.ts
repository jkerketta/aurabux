import type { SupabaseClient } from "@supabase/supabase-js";

function isSameOrAdjacentDay(prev: Date, curr: Date): boolean {
  const diffMs = curr.getTime() - prev.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return diffMs >= 0 && diffMs < dayMs * 2;
}

export async function getCurrentStreak(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_spins")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return 0;

  const spins = data.map((row: { created_at: string }) => new Date(row.created_at));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let prevDay = new Date(spins[0]);
  prevDay.setHours(0, 0, 0, 0);

  if (!isSameOrAdjacentDay(prevDay, today)) return 0;

  let streak = 0;
  let lastSeen: Date | null = null;
  for (const spin of spins) {
    const day = new Date(spin);
    day.setHours(0, 0, 0, 0);
    if (lastSeen === null) {
      streak = 1;
      lastSeen = day;
      continue;
    }
    const diffDays = Math.round((lastSeen.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      streak += 1;
      lastSeen = day;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export function getStreakBonus(streak: number): number {
  if (streak <= 0) return 1;
  return Math.min(1 + streak * 0.10, 1.70);
}