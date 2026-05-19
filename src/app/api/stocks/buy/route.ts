import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const totalCost = shares * pricePerShare;

    // Fetch user's portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from("portfolios")
      .select("abx_balance, total_value")
      .eq("user_id", user.id)
      .single();

    if (portfolioError || !portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    const currentBalance = Number(portfolio.abx_balance);
    if (currentBalance < totalCost) {
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

    // Step 1: Deduct balance
    const { error: deductError } = await supabase
      .from("portfolios")
      .update({ abx_balance: newBalance })
      .eq("user_id", user.id);

    if (deductError) {
      throw deductError;
    }

    // Track original balance for potential compensation
    const originalBalance = currentBalance;

    try {
      // Step 2: Upsert holding
      const { data: existingHolding } = await supabase
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

        const { error: updateError } = await supabase
          .from("holdings")
          .update({ shares: totalShares, avg_buy_price: Math.round(newAvg * 100) / 100 })
          .eq("user_id", user.id)
          .eq("ticker", normalizedSymbol);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
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
      const { error: txnError } = await supabase.from("transactions").insert({
        user_id: user.id,
        ticker: normalizedSymbol,
        type: "buy",
        shares,
        price_per_share: Math.round(pricePerShare * 100) / 100,
      });

      if (txnError) throw txnError;
    } catch (error) {
      // Compensate: revert the balance deduction
      await supabase
        .from("portfolios")
        .update({ abx_balance: originalBalance })
        .eq("user_id", user.id);

      throw error;
    }

    return NextResponse.json({
      success: true,
      balance: newBalance,
      shares_bought: shares,
      symbol: normalizedSymbol,
      total_cost: totalCost,
    });
  } catch (error) {
    console.error("Stock buy error:", error);
    return NextResponse.json(
      { error: "Failed to execute purchase" },
      { status: 500 }
    );
  }
}
