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

    if (!shares || typeof shares !== "number" || shares <= 0) {
      return NextResponse.json(
        { error: "shares must be a positive number" },
        { status: 400 }
      );
    }

    if (!pricePerShare || typeof pricePerShare !== "number" || pricePerShare <= 0) {
      return NextResponse.json(
        { error: "pricePerShare must be a positive number" },
        { status: 400 }
      );
    }

    const normalizedSymbol = symbol.trim().toUpperCase();

    if (normalizedSymbol.endsWith(".TO")) {
      return NextResponse.json({ error: "Canadian stocks (.TO) are not supported" }, { status: 400 });
    }

    // Server-side price verification: try cache, then live fetch as fallback
    let livePrice = cache.get<{ currentPrice: number }>(`quote:${normalizedSymbol}`)?.currentPrice;

    if (livePrice == null) {
      const host = request.headers.get("host") ?? "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      try {
        const quoteRes = await fetch(`${protocol}://${host}/api/stocks/quote?symbol=${encodeURIComponent(normalizedSymbol)}`);
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          livePrice = Number(quoteData.currentPrice);
        }
      } catch { /* ignore */ }
    }

    if (livePrice == null || livePrice <= 0) {
      return NextResponse.json(
        { error: "Could not verify current price. Please refresh and try again." },
        { status: 400 }
      );
    }
    const tolerance = 0.05; // 5% tolerance
    if (Math.abs(pricePerShare - livePrice) / livePrice > tolerance) {
      return NextResponse.json(
        { error: "Price has changed significantly. Please refresh and try again." },
        { status: 400 }
      );
    }

    const totalCost = shares * pricePerShare;

    // Fetch user's portfolio (use admin client to bypass RLS for reliable read)
    const adminClient = createAdminClient();
    const { data: portfolio, error: portfolioError } = await adminClient
      .from("portfolios")
      .select("abx_balance, total_value, total_invested")
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
        // If insert failed due to unique constraint, portfolio exists — try reading again
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

    // Round to 2 decimals to avoid floating-point drift (e.g., 0.34 * 30.41 ≈ 10.3400000001)
    const roundedBalance = Math.round(currentBalance * 100) / 100;
    const roundedCost = Math.round(totalCost * 100) / 100;

    if (roundedBalance < roundedCost) {
      return NextResponse.json(
        {
          error: "Insufficient ABX balance",
          balance: currentBalance,
          required: totalCost,
        },
        { status: 400 }
      );
    }

    const newBalance = currentBalance - totalCost;

    // Step 1: Deduct balance and increment total_invested (optimistic locking)
    const currentTotalInvested = Number(portfolio?.total_invested ?? 0);
    const { data: balanceUpdated, error: deductError } = await adminClient
      .from("portfolios")
      .update({ abx_balance: newBalance, total_invested: currentTotalInvested + totalCost })
      .eq("user_id", user.id)
      .eq("abx_balance", currentBalance)
      .select("abx_balance");

    if (deductError) throw deductError;

    if (!balanceUpdated || balanceUpdated.length === 0) {
      return NextResponse.json(
        { error: "Balance changed during transaction. Please refresh and try again." },
        { status: 409 }
      );
    }

    // Track original values for potential compensation
    const originalBalance = currentBalance;

    try {
      // Step 2: Upsert holding
      const { data: existingHolding } = await adminClient
        .from("holdings")
        .select("shares, avg_buy_price")
        .eq("user_id", user.id)
        .eq("ticker", normalizedSymbol)
        .single();

      if (existingHolding) {
        const oldShares = Number(existingHolding.shares);
        const oldAvg = Number(existingHolding.avg_buy_price);
        const totalShares = oldShares + shares;
        const newAvg =
          (oldShares * oldAvg + shares * pricePerShare) / totalShares;

        const { data: holdingUpdated, error: updateError } = await adminClient
          .from("holdings")
          .update({ shares: totalShares, avg_buy_price: Math.round(newAvg * 100) / 100 })
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol)
          .eq("shares", oldShares)
          .select();

        if (updateError) throw updateError;

        if (!holdingUpdated || holdingUpdated.length === 0) {
          // Compensation: revert balance
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
        const { error: insertError } = await adminClient
          .from("holdings")
          .insert({
            user_id: user.id,
            ticker: normalizedSymbol,
            shares,
            avg_buy_price: Math.round(pricePerShare * 100) / 100,
          });

        if (insertError) throw insertError;
      }

      // Step 3: Record transaction
      const { error: txnError } = await adminClient.from("transactions").insert({
        user_id: user.id,
        ticker: normalizedSymbol,
        type: "buy",
        shares,
        price_per_share: Math.round(pricePerShare * 100) / 100,
      });

      if (txnError) throw txnError;
    } catch (error) {
      // Compensate: revert the balance deduction and total_invested
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
        action: "buy",
        portfolioTotalValue: Number(updatedPortfolio?.total_value ?? newBalance),
      });
    } catch {
      // Achievement evaluation should never break the buy flow
    }

    return NextResponse.json({
      success: true,
      balance: newBalance,
      shares_bought: shares,
      symbol: normalizedSymbol,
      total_cost: totalCost,
      achievementsUnlocked,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute purchase" },
      { status: 500 }
    );
  }
}
