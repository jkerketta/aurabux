import { createClient } from "@/lib/supabase/server";
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
    .select("abx_balance, total_value")
    .eq("user_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single();

  const balance = portfolio?.abx_balance ?? 1000;
  const totalValue = portfolio?.total_value ?? 1000;
  const username = profile?.username ?? "";

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
        />
      </div>
    </div>
  );
}
