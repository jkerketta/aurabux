import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("abx_balance, total_value")
    .eq("user_id", user?.id)
    .single();

  const { data: profile } = await supabase
    .from("users")
    .select("username")
    .eq("id", user?.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {profile?.username || "Trader"}
        </h1>
        <p className="mt-1 text-text-secondary">
          Your portfolio overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-surface p-6">
          <p className="text-sm text-text-secondary">ABX Balance</p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {portfolio?.abx_balance?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "1,000.00"}{" "}
            ABX
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface p-6">
          <p className="text-sm text-text-secondary">Total Value</p>
          <p className="mt-2 text-3xl font-bold text-text-primary">
            {portfolio?.total_value?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "1,000.00"}{" "}
            ABX
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-surface p-6">
          <p className="text-sm text-text-secondary">Starting Balance</p>
          <p className="mt-2 text-3xl font-bold text-text-secondary">
            1,000.00 ABX
          </p>
        </div>
      </div>
    </div>
  );
}
