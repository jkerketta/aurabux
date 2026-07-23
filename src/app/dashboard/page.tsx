import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import { getSpinStatus } from "@/lib/spin";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware guarantees user exists here, but keep TS happy
  if (!user) {
    redirect("/login");
  }

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("abx_balance, total_invested")
    .eq("user_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("users")
    .select("username, has_seen_onboarding")
    .eq("id", user.id)
    .single();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("ticker, shares, avg_buy_price")
    .eq("user_id", user.id)
    .order("ticker");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("ticker, type, shares, price_per_share, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const balance = Number(portfolio?.abx_balance ?? 10000);
  const totalInvested = Number(portfolio?.total_invested ?? 0);
  const username = profile?.username ?? "";

  // Fetch spin status directly (no API route needed — avoids cookie issues)
  let spinStatus = {
    canSpin: false,
    nextResetAt: null as string | null,
    hasActivePowerup: false,
    activePowerupExpiresAt: null as string | null,
    hasExpiredPowerup: false,
    freeSpinsRemaining: 0,
  };
  try {
    spinStatus = await getSpinStatus(user.id);
  } catch {}

  // Build base URL for stock quote API (doesn't require auth)
  const { headers } = await import("next/headers");
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  // Fetch current prices and logos for each holding
  let enrichedHoldings: Array<{
    ticker: string;
    shares: number;
    avg_buy_price: number;
    current_price: number;
    logo: string | null;
  }> = [];
  let totalValue = balance;

  if (holdings && holdings.length > 0) {
    const pricePromises = holdings.map(async (h: { ticker: string; shares: number; avg_buy_price: number }) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(h.ticker)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          return data.currentPrice != null && !isNaN(Number(data.currentPrice)) ? Number(data.currentPrice) : Number(h.avg_buy_price);
        }
      } catch {
        // network error, fall through to fallback
      }
      return Number(h.avg_buy_price);
    });

    const logoPromises = holdings.map(async (h: { ticker: string }) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/stocks/profile?symbol=${encodeURIComponent(h.ticker)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          return data.logo ?? null;
        }
      } catch {
        // network error, fall through
      }
      return null;
    });

    const [prices, logos] = await Promise.all([Promise.all(pricePromises), Promise.all(logoPromises)]);

    const holdingsValue = holdings.reduce(
      (sum: number, h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => sum + Number(h.shares) * prices[i],
      0
    );

    enrichedHoldings = holdings.map((h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => ({
      ticker: h.ticker,
      shares: Number(h.shares),
      avg_buy_price: Number(h.avg_buy_price),
      current_price: prices[i],
      logo: logos[i],
    }));

    totalValue = balance + holdingsValue;
  }

  // Time-aware greeting (computed on the server)
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) {
    greeting = "Good morning";
  } else if (hour < 17) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-12">
        <ErrorBoundary fallbackTitle="Dashboard failed to load">
          <DashboardContent
            user={user}
            initialBalance={balance}
            initialTotalValue={totalValue}
            username={username}
            greeting={greeting}
            holdings={enrichedHoldings}
            transactions={transactions ?? []}
            totalInvested={totalInvested}
            hasSeenOnboarding={profile?.has_seen_onboarding ?? true}
            canSpin={spinStatus.canSpin}
            hasActivePowerup={spinStatus.hasActivePowerup}
            activePowerupExpiresAt={spinStatus.activePowerupExpiresAt}
            hasExpiredPowerup={spinStatus.hasExpiredPowerup}
            nextResetAt={spinStatus.nextResetAt}
            freeSpinsRemaining={spinStatus.freeSpinsRemaining}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
