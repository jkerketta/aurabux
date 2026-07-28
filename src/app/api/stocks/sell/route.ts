import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cache } from "@/lib/cache";
import { evaluateAchievements } from "@/lib/achievements";

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

    // Server-side price verification: check cached live price
    const cached = cache.get<{ currentPrice: number }>(`quote:${normalizedSymbol}`);

    if (!cached) {
      return NextResponse.json(
        { error: "Could not verify current price. Please refresh and try again." },
        { status: 400 }
      );
    }

    const livePrice = cached.currentPrice;
    const tolerance = 0.05; // 5% tolerance
    if (Math.abs(pricePerShare - livePrice) / livePrice > tolerance) {
      return NextResponse.json(
        { error: "Price has changed significantly. Please refresh and try again." },
        { status: 400 }
      );
    }

    const proceeds = shares * pricePerShare;

    const adminClient = createAdminClient();

    // Fetch user's holding for this symbol
    const { data: holding, error: holdingError } = await adminClient
      .from("holdings")
      .select("shares, avg_buy_price")
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
    const avgBuyPrice = Number(holding.avg_buy_price);
    const costBasis = shares * avgBuyPrice;

    // Round to 2 decimals to avoid floating-point drift
    const roundedOwned = Math.round(ownedShares * 100) / 100;
    const roundedShares = Math.round(shares * 100) / 100;
    if (roundedOwned < roundedShares) {
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
    const { data: portfolio, error: portfolioError } = await adminClient
      .from("portfolios")
      .select("abx_balance, total_invested")
      .eq("user_id", user.id)
      .single();

    let currentBalance: number;

    if (portfolioError || !portfolio) {
      // Auto-heal: create portfolio if missing
      const { data: newPortfolio, error: insertError } = await adminClient
        .from("portfolios")
        .insert({
          user_id: user.id,
          abx_balance: 10000,
          total_value: 10000,
          total_invested: 0,
        })
        .select("abx_balance")
        .single();

      if (insertError) {
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

    const currentTotalInvested = Number(portfolio?.total_invested ?? 0);
    const newTotalInvested = Math.max(0, currentTotalInvested - costBasis);
    const newBalance = currentBalance + proceeds;

    // Step 1: Add proceeds to balance and decrement total_invested
    const { data: balanceUpdated, error: creditError } = await adminClient
      .from("portfolios")
      .update({ abx_balance: newBalance, total_invested: newTotalInvested })
      .eq("user_id", user.id)
      .eq("abx_balance", currentBalance)
      .select("abx_balance");

    if (creditError) throw creditError;

    if (!balanceUpdated || balanceUpdated.length === 0) {
      return NextResponse.json(
        { error: "Balance changed during transaction. Please refresh and try again." },
        { status: 409 }
      );
    }

    // Track original balance for potential compensation
    const originalBalance = currentBalance;

    try {
      // Step 2: Update or delete holding
      const remainingShares = ownedShares - shares;

      if (remainingShares <= 0) {
        // Delete the holding row entirely
        const { data: deleteUpdated, error: deleteError } = await adminClient
          .from("holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol)
          .eq("shares", ownedShares)
          .select();

        if (deleteError) throw deleteError;

        if (!deleteUpdated || deleteUpdated.length === 0) {
          await adminClient
            .from("portfolios")
            .update({ abx_balance: currentBalance, total_invested: currentTotalInvested })
            .eq("user_id", user.id);
          return NextResponse.json(
            { error: "Holding changed during transaction. Please refresh and try again." },
            { status: 409 }
          );
        }
      } else {
        // Update shares count
        const { data: holdingUpdated, error: updateError } = await adminClient
          .from("holdings")
          .update({ shares: remainingShares })
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol)
          .eq("shares", ownedShares)
          .select();

        if (updateError) throw updateError;

        if (!holdingUpdated || holdingUpdated.length === 0) {
          await adminClient
            .from("portfolios")
            .update({ abx_balance: currentBalance, total_invested: currentTotalInvested })
            .eq("user_id", user.id);
          return NextResponse.json(
            { error: "Holding changed during transaction. Please refresh and try again." },
            { status: 409 }
          );
        }
      }

      // Step 3: Record transaction
      const { error: txnError } = await adminClient.from("transactions").insert({
        user_id: user.id,
        ticker: normalizedSymbol,
        type: "sell",
        shares,
        price_per_share: Math.round(pricePerShare * 100) / 100,
      });

      if (txnError) throw txnError;
    } catch (error) {
      // Compensate: revert the balance credit and total_invested
      await adminClient
        .from("portfolios")
        .update({ abx_balance: originalBalance, total_invested: currentTotalInvested })
        .eq("user_id", user.id);

      throw error;
    }

    // Check achievements
    let achievementsUnlocked: string[] = [];
    try {
      const { data: updatedPortfolio } = await adminClient
        .from("portfolios")
        .select("total_value")
        .eq("user_id", user.id)
        .single();
      achievementsUnlocked = await evaluateAchievements(adminClient, user.id, {
        action: "sell",
        portfolioTotalValue: Number(updatedPortfolio?.total_value ?? newBalance),
      });
    } catch {
      // Achievement evaluation should never break the sell flow
    }

    return NextResponse.json({
      success: true,
      balance: newBalance,
      shares_sold: shares,
      symbol: normalizedSymbol,
      proceeds,
      achievementsUnlocked,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute sell" },
      { status: 500 }
    );
  }
}
