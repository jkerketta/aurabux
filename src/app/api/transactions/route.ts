import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pageParam = request.nextUrl.searchParams.get("page");
    const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

    const adminClient = createAdminClient();

    // Get total count
    const { count } = await adminClient
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const total = count ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Get paginated transactions
    const { data: transactions, error } = await adminClient
      .from("transactions")
      .select("ticker, type, shares, price_per_share, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (error) throw error;

    return NextResponse.json({
      transactions: (transactions ?? []).map((t) => ({
        ticker: t.ticker,
        type: t.type as "buy" | "sell" | "spin",
        shares: Number(t.shares),
        price_per_share: Number(t.price_per_share),
        created_at: t.created_at,
      })),
      page,
      totalPages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
