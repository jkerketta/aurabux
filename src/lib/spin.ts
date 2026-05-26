import { createClient } from "@/lib/supabase/server";

const RESET_HOUR_UTC = 21;

export function getTodayReset() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RESET_HOUR_UTC, 0, 0));
}

export function getNextReset() {
  const now = new Date();
  const todayReset = getTodayReset();
  if (now >= todayReset) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, RESET_HOUR_UTC, 0, 0));
  }
  return todayReset;
}

export interface SpinStatus {
  canSpin: boolean;
  nextResetAt: string | null;
  hasActivePowerup: boolean;
  activePowerupExpiresAt: string | null;
  hasExpiredPowerup: boolean;
  freeSpinsRemaining: number;
}

export async function getSpinStatus(userId: string): Promise<SpinStatus> {
  const supabase = await createClient();

  const { data: lastSpin } = await supabase
    .from("daily_spins")
    .select("reward_type, reward_value, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("free_spins")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const todayReset = getTodayReset();
  const nextReset = getNextReset();

  // Current spin period started at the most recent reset (today's if after reset, yesterday's if before)
  const currentPeriodStart = now >= todayReset
    ? todayReset
    : new Date(todayReset.getTime() - 24 * 60 * 60 * 1000);

  const hasFreeSpins = (portfolio?.free_spins ?? 0) > 0;
  const canSpin = hasFreeSpins || !lastSpin || new Date(lastSpin.created_at) < currentPeriodStart;

  const { data: activePowerup } = await supabase
    .from("powerups")
    .select("id, expires_at, snapshot_value")
    .eq("user_id", userId)
    .eq("type", "x2_returns")
    .eq("claimed", false)
    .gt("expires_at", now.toISOString())
    .limit(1)
    .maybeSingle();

  const { data: expiredPowerup } = await supabase
    .from("powerups")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "x2_returns")
    .eq("claimed", false)
    .lt("expires_at", now.toISOString())
    .limit(1)
    .maybeSingle();

  return {
    canSpin,
    nextResetAt: nextReset.toISOString(),
    hasActivePowerup: !!activePowerup,
    activePowerupExpiresAt: activePowerup?.expires_at ?? null,
    hasExpiredPowerup: !!expiredPowerup,
    freeSpinsRemaining: portfolio?.free_spins ?? 0,
  };
}
