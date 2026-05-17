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
    <div className="pb-20">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-black">
          Welcome, {profile?.username || "Trader"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your portfolio overview
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">ABX Balance</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-green-600">
            {portfolio?.abx_balance?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "1,000.00"}{" "}
            <span className="text-lg font-medium text-text-muted">ABX</span>
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Total Value</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-black">
            {portfolio?.total_value?.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) ?? "1,000.00"}{" "}
            <span className="text-lg font-medium text-text-muted">ABX</span>
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Starting Balance</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-400">
            1,000.00{" "}
            <span className="text-lg font-medium text-text-muted">ABX</span>
          </p>
        </div>
      </div>
    </div>
  );
}
