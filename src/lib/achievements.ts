import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentStreak } from "./streak";

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: "trading" | "portfolio" | "returns" | "spin" | "holdings";
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: "first_trade", title: "First Trade", description: "Complete 1 buy or sell", icon: "Coins", category: "trading" },
  { key: "10_trades", title: "Active Trader", description: "Complete 10 transactions", icon: "Activity", category: "trading" },
  { key: "100_trades", title: "Day Trader", description: "Complete 100 transactions", icon: "TrendingUp", category: "trading" },
  { key: "1000_trades", title: "Wall Street", description: "Complete 1000 transactions", icon: "Landmark", category: "trading" },
  { key: "net_worth_15k", title: "Rising Star", description: "Portfolio value ≥ 15,000 ABX", icon: "Star", category: "portfolio" },
  { key: "net_worth_25k", title: "Climbing", description: "Portfolio value ≥ 25,000 ABX", icon: "TrendingUp", category: "portfolio" },
  { key: "net_worth_50k", title: "Halfway to 100K", description: "Portfolio value ≥ 50,000 ABX", icon: "Award", category: "portfolio" },
  { key: "net_worth_100k", title: "Century Club", description: "Portfolio value ≥ 100,000 ABX", icon: "Trophy", category: "portfolio" },
  { key: "net_worth_250k", title: "Quarter Million", description: "Portfolio value ≥ 250,000 ABX", icon: "Crown", category: "portfolio" },
  { key: "return_10pct", title: "Green Thumb", description: "+10% all-time return", icon: "Leaf", category: "returns" },
  { key: "return_25pct", title: "Bull Market", description: "+25% all-time return", icon: "TrendingUp", category: "returns" },
  { key: "return_50pct", title: "Big Swing", description: "+50% all-time return", icon: "Rocket", category: "returns" },
  { key: "return_100pct", title: "Doubled Up", description: "+100% all-time return", icon: "Gem", category: "returns" },
  { key: "streak_3", title: "Habit Forming", description: "3-day spin streak", icon: "Flame", category: "spin" },
  { key: "streak_7", title: "Week Warrior", description: "7-day spin streak", icon: "Flame", category: "spin" },
  { key: "streak_30", title: "Monthly Grinder", description: "30-day spin streak", icon: "Flame", category: "spin" },
  { key: "streak_100", title: "Centurion", description: "100-day spin streak", icon: "Flame", category: "spin" },
  { key: "first_spin", title: "Lucky Beginner", description: "Complete first daily spin", icon: "RotateCw", category: "spin" },
  { key: "hold_stock_30d", title: "Diamond Hands", description: "Hold any stock for 30+ days", icon: "Gem", category: "holdings" },
  { key: "5_distinct", title: "Diversified", description: "Hold 5+ distinct tickers simultaneously", icon: "LayoutGrid", category: "holdings" },
];

export function getAchievementByKey(key: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

async function getTxnCount(client: SupabaseClient, userId: string): Promise<number> {
  const { count } = await client.from("transactions").select("*", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

async function getDistinctHoldingsCount(client: SupabaseClient, userId: string): Promise<number> {
  const { count } = await client.from("holdings").select("*", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

async function getEarliestHoldingAgeDays(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client.from("holdings").select("created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(1);
  if (!data || data.length === 0) return 0;
  const created = new Date(data[0].created_at);
  const diffMs = Date.now() - created.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

async function getTotalInvested(client: SupabaseClient, userId: string): Promise<number> {
  const { data } = await client.from("portfolios").select("total_invested").eq("user_id", userId).single();
  return Number(data?.total_invested ?? 0);
}

async function getUnlockedKeys(client: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await client.from("user_achievements").select("achievement_key").eq("user_id", userId);
  return new Set((data ?? []).map((r: { achievement_key: string }) => r.achievement_key));
}

export async function evaluateAchievements(
  adminClient: SupabaseClient,
  userId: string,
  context: { action: "buy" | "sell" | "spin"; portfolioTotalValue?: number }
): Promise<string[]> {
  const unlocked = await getUnlockedKeys(adminClient, userId);
  const newlyUnlocked: string[] = [];

  const txnCount = await getTxnCount(adminClient, userId);
  if (txnCount >= 1 && !unlocked.has("first_trade")) newlyUnlocked.push("first_trade");
  if (txnCount >= 10 && !unlocked.has("10_trades")) newlyUnlocked.push("10_trades");
  if (txnCount >= 100 && !unlocked.has("100_trades")) newlyUnlocked.push("100_trades");
  if (txnCount >= 1000 && !unlocked.has("1000_trades")) newlyUnlocked.push("1000_trades");

  const totalValue = context.portfolioTotalValue;
  if (totalValue !== undefined) {
    const thresholds: [number, string][] = [
      [15000, "net_worth_15k"], [25000, "net_worth_25k"], [50000, "net_worth_50k"],
      [100000, "net_worth_100k"], [250000, "net_worth_250k"],
    ];
    for (const [threshold, key] of thresholds) {
      if (totalValue >= threshold && !unlocked.has(key)) newlyUnlocked.push(key);
    }
  }

  const totalInvested = await getTotalInvested(adminClient, userId);
  if (totalInvested > 0 && totalValue !== undefined) {
    const pct = ((totalValue - totalInvested) / totalInvested) * 100;
    if (pct >= 10 && !unlocked.has("return_10pct")) newlyUnlocked.push("return_10pct");
    if (pct >= 25 && !unlocked.has("return_25pct")) newlyUnlocked.push("return_25pct");
    if (pct >= 50 && !unlocked.has("return_50pct")) newlyUnlocked.push("return_50pct");
    if (pct >= 100 && !unlocked.has("return_100pct")) newlyUnlocked.push("return_100pct");
  }

  if (context.action === "spin") {
    if (!unlocked.has("first_spin")) newlyUnlocked.push("first_spin");
    const streak = await getCurrentStreak(adminClient, userId);
    if (streak >= 3 && !unlocked.has("streak_3")) newlyUnlocked.push("streak_3");
    if (streak >= 7 && !unlocked.has("streak_7")) newlyUnlocked.push("streak_7");
    if (streak >= 30 && !unlocked.has("streak_30")) newlyUnlocked.push("streak_30");
    if (streak >= 100 && !unlocked.has("streak_100")) newlyUnlocked.push("streak_100");
  }

  const distinctCount = await getDistinctHoldingsCount(adminClient, userId);
  if (distinctCount >= 5 && !unlocked.has("5_distinct")) newlyUnlocked.push("5_distinct");
  const holdingAgeDays = await getEarliestHoldingAgeDays(adminClient, userId);
  if (holdingAgeDays >= 30 && !unlocked.has("hold_stock_30d")) newlyUnlocked.push("hold_stock_30d");

  if (newlyUnlocked.length > 0) {
    const { error } = await adminClient
      .from("user_achievements")
      .upsert(
        newlyUnlocked.map((k) => ({ user_id: userId, achievement_key: k })),
        { onConflict: "user_id,achievement_key" }
      );
    if (error) throw error;
  }
  return newlyUnlocked;
}