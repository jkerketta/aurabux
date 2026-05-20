import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";

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
    .select("abx_balance")
    .eq("user_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("users")
    .select("username")
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
    .limit(10);

  const balance = Number(portfolio?.abx_balance ?? 1000);
  const username = profile?.username ?? "";

  // Fetch current prices for each holding and calculate total value
  let enrichedHoldings: Array<{
    ticker: string;
    shares: number;
    avg_buy_price: number;
    current_price: number;
  }> = [];
  let totalValue = balance;

  if (holdings && holdings.length > 0) {
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const pricePromises = holdings.map(async (h: { ticker: string; shares: number; avg_buy_price: number }) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(h.ticker)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          return Number(data.currentPrice) ?? Number(h.avg_buy_price);
        }
      } catch {
        // network error, fall through to fallback
      }
      return Number(h.avg_buy_price);
    });

    const prices = await Promise.all(pricePromises);
    const holdingsValue = holdings.reduce(
      (sum: number, h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => sum + Number(h.shares) * prices[i],
      0
    );

    enrichedHoldings = holdings.map((h: { ticker: string; shares: number; avg_buy_price: number }, i: number) => ({
      ticker: h.ticker,
      shares: Number(h.shares),
      avg_buy_price: Number(h.avg_buy_price),
      current_price: prices[i],
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
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-8 py-12">
        <DashboardContent
          user={user}
          initialBalance={balance}
          initialTotalValue={totalValue}
          username={username}
          greeting={greeting}
          holdings={enrichedHoldings}
          transactions={transactions ?? []}
        />
      </div>
    </div>
  );
}
