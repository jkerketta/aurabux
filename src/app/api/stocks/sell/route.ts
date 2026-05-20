import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    let body: { symbol?: string; shares?: number; pricePerShare?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { symbol, shares, pricePerShare } = body;

    if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0) {
      return NextResponse.json(
        { error: "symbol is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof shares !== "number" || shares <= 0) {
      return NextResponse.json(
        { error: "shares must be a positive number" },
        { status: 400 }
      );
    }

    if (typeof pricePerShare !== "number" || pricePerShare <= 0) {
      return NextResponse.json(
        { error: "pricePerShare must be a positive number" },
        { status: 400 }
      );
    }

    const normalizedSymbol = symbol.trim().toUpperCase();

    if (normalizedSymbol.endsWith(".TO")) {
      return NextResponse.json({ error: "Canadian stocks (.TO) are not supported" }, { status: 400 });
    }

    const proceeds = shares * pricePerShare;

    // Fetch user's holding for this symbol
    const { data: holding, error: holdingError } = await supabase
      .from("holdings")
      .select("shares")
      .eq("user_id", user.id)
      .eq("ticker", normalizedSymbol)
      .single();

    if (holdingError || !holding) {
      return NextResponse.json(
        { error: "You don't own any shares of this stock" },
        { status: 400 }
      );
    }

    const ownedShares = Number(holding.shares);
    if (ownedShares < shares) {
      return NextResponse.json(
        {
          error: "Insufficient shares",
          owned: ownedShares,
          requested: shares,
        },
        { status: 400 }
      );
    }

    // Fetch portfolio (use admin client to bypass RLS for reliable read)
    const adminClient = createAdminClient();
    const { data: portfolio, error: portfolioError } = await adminClient
      .from("portfolios")
      .select("abx_balance")
      .eq("user_id", user.id)
      .single();

    let currentBalance: number;

    if (portfolioError || !portfolio) {
      // Auto-heal: create portfolio if missing
      console.log("Portfolio not found for user, creating one...");
      const { data: newPortfolio, error: insertError } = await adminClient
        .from("portfolios")
        .insert({
          user_id: user.id,
          abx_balance: 1000,
          total_value: 1000,
        })
        .select("abx_balance")
        .single();

      if (insertError) {
        console.error("Failed to create portfolio:", insertError);
        if (insertError.code === "23505") {
          const { data: retryPortfolio } = await adminClient
            .from("portfolios")
            .select("abx_balance")
            .eq("user_id", user.id)
            .single();
          if (retryPortfolio) {
            currentBalance = Number(retryPortfolio.abx_balance);
          } else {
            return NextResponse.json(
              { error: "Failed to initialize portfolio" },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Failed to initialize portfolio" },
            { status: 500 }
          );
        }
      } else {
        currentBalance = Number(newPortfolio.abx_balance);
      }
    } else {
      currentBalance = Number(portfolio.abx_balance);
    }

    const newBalance = currentBalance + proceeds;

    // Step 1: Add proceeds to balance
    const { error: creditError } = await supabase
      .from("portfolios")
      .update({ abx_balance: newBalance })
      .eq("user_id", user.id);

    if (creditError) {
      throw creditError;
    }

    // Track original balance for potential compensation
    const originalBalance = currentBalance;

    try {
      // Step 2: Update or delete holding
      const remainingShares = ownedShares - shares;

      if (remainingShares <= 0) {
        // Delete the holding row entirely
        const { error: deleteError } = await supabase
          .from("holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol);

        if (deleteError) throw deleteError;
      } else {
        // Update shares count
        const { error: updateError } = await supabase
          .from("holdings")
          .update({ shares: remainingShares })
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol);

        if (updateError) throw updateError;
      }

      // Step 3: Record transaction
      const { error: txnError } = await supabase.from("transactions").insert({
        user_id: user.id,
        ticker: normalizedSymbol,
        type: "sell",
        shares,
        price_per_share: Math.round(pricePerShare * 100) / 100,
      });

      if (txnError) throw txnError;
    } catch (error) {
      // Compensate: revert the balance credit
      await supabase
        .from("portfolios")
        .update({ abx_balance: originalBalance })
        .eq("user_id", user.id);

      throw error;
    }

    return NextResponse.json({
      success: true,
      balance: newBalance,
      shares_sold: shares,
      symbol: normalizedSymbol,
      proceeds,
    });
  } catch (error) {
    console.error("Stock sell error:", error);
    return NextResponse.json(
      { error: "Failed to execute sell" },
      { status: 500 }
    );
  }
}
