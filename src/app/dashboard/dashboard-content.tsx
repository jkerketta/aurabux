"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Eye, EyeOff, RotateCw, Zap, Clock } from "lucide-react";
import { SpinModal } from "@/components/spinner/spin-modal";
import { X2ClaimModal } from "@/components/spinner/x2-claim-modal";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
}

interface Transaction {
  ticker: string;
  type: "buy" | "sell";
  shares: number;
  price_per_share: number;
  created_at: string;
}

interface DashboardContentProps {
  user: User;
  initialBalance: number;
  initialTotalValue: number;
  username: string;
  greeting: string;
  holdings: Holding[];
  transactions: Transaction[];
  totalInvested: number;
  canSpin: boolean;
  hasActivePowerup: boolean;
  activePowerupExpiresAt: string | null;
  hasExpiredPowerup: boolean;
  nextResetAt: string | null;
  freeSpinsRemaining: number;
}

// Static objects — extracted outside component to avoid recreation on every render
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatShares(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function DashboardContent({
  user: _user,
  initialBalance,
  initialTotalValue,
  username,
  greeting,
  holdings,
  transactions,
  totalInvested,
  canSpin,
  hasActivePowerup,
  activePowerupExpiresAt,
  hasExpiredPowerup,
  nextResetAt,
  freeSpinsRemaining,
}: DashboardContentProps) {
  const router = useRouter();
  const [showValues, setShowValues] = useState(true);
  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(hasExpiredPowerup);
  const [x2Countdown, setX2Countdown] = useState("");

  // x2 powerup countdown timer
  useEffect(() => {
    if (!activePowerupExpiresAt) {
      setX2Countdown("");
      return;
    }
    const update = () => {
      const ms = new Date(activePowerupExpiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setX2Countdown("");
        router.refresh();
        return;
      }
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setX2Countdown(`${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activePowerupExpiresAt, router]);

  const displayBalance = showValues ? formatCurrency(initialBalance) : "••••••";
  const displayTotalValue = showValues ? formatCurrency(initialTotalValue) : "••••••";

  // All-time portfolio return: based on total invested, not hardcoded 1000
  const investmentsValue = holdings.reduce((sum, h) => sum + h.shares * h.current_price, 0);
  const allTimeReturn = totalInvested > 0 ? ((investmentsValue - totalInvested) / totalInvested) * 100 : 0;
  const isAllTimePositive = allTimeReturn >= 0;
  const displayInvestments = showValues ? formatCurrency(investmentsValue) : "••••••";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-20"
    >
      {/* Greeting Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          {greeting}, {username || "Trader"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* Portfolio Value Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Portfolio Value
              </CardDescription>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowValues(!showValues)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {showValues ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold tracking-tight text-black">
              {displayTotalValue} ABX
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 mb-8">
        {/* ABX Balance Card */}
        <Card className="min-h-[120px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ABX Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-black">
              {displayBalance} <span className="text-lg font-normal text-muted-foreground">ABX</span>
            </p>
            <div className="mt-3">
              <div className="relative inline-flex items-center gap-2 cursor-pointer group" onClick={() => setSpinModalOpen(true)}>
                <RotateCw className={cn("h-4 w-4 transition-colors", canSpin ? "text-black group-hover:text-neutral-600" : "text-neutral-300")} />
                <span className={cn("text-xs font-semibold uppercase tracking-wider transition-colors", canSpin ? "text-black group-hover:text-neutral-600" : "text-neutral-300")}>
                  Daily Spin
                </span>
                {(canSpin) && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </div>
              {freeSpinsRemaining > 0 && (
                <p className="mt-1 text-xs text-cyan-600 font-medium">
                  {freeSpinsRemaining} free spin{freeSpinsRemaining !== 1 ? "s" : ""} left
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Investments Card */}
        <Card className="min-h-[120px]">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Investments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-black">
              {displayInvestments} <span className="text-lg font-normal text-muted-foreground">ABX</span>
            </p>
            <div className="mt-2">
              <div className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
                showValues
                  ? (isAllTimePositive ? "bg-[#00C805]/10 text-[#00A804]" : "bg-[#FF4444]/10 text-[#CC3333]")
                  : "bg-neutral-100 text-neutral-400"
              )}>
                {showValues
                  ? `${isAllTimePositive ? "+" : ""}${allTimeReturn.toFixed(2)}% all time`
                  : "••••••"}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Holdings Section */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-black">Holdings</h2>
          {hasActivePowerup && x2Countdown && (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 border border-rose-200">
              <Zap className="h-3.5 w-3.5 text-rose-600 fill-rose-600" />
              <span className="text-xs font-semibold text-rose-700">2x Returns</span>
              <Clock className="h-3 w-3 text-rose-400 ml-1" />
              <span className="text-xs font-mono text-rose-600">{x2Countdown}</span>
            </div>
          )}
        </div>
        {holdings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-black">No holdings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start trading to build your portfolio
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full">
              <tbody className="divide-y divide-neutral-100">
                {holdings.map((h) => {
                  const currentValue = h.shares * h.current_price;
                  const costBasis = h.shares * h.avg_buy_price;
                  const pnl = currentValue - costBasis;
                  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                  const isPnlPositive = pnl >= 0;
                  return (
                    <tr
                      key={h.ticker}
                      className="group cursor-pointer hover:bg-neutral-50 transition-colors"
                      onClick={() => router.push(`/dashboard/stock/${h.ticker}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-black">{h.ticker}</p>
                        <p className="text-xs text-muted-foreground">{formatShares(h.shares)} share{formatShares(h.shares) !== "1" ? "s" : ""}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]"
                          )}
                        >
                          {isPnlPositive ? "+" : ""}
                          {formatCurrency(pnl)}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]"
                          )}
                        >
                          ({isPnlPositive ? "+" : ""}
                          {pnlPercent.toFixed(2)}%)
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Recent Transactions Section */}
      <motion.div variants={itemVariants}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-black">
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-black">No transactions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your trade history will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Ticker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Shares
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((t, i) => {
                  const total = t.shares * t.price_per_share;
                  const colorMap: Record<string, string> = {
                    buy: "bg-[#00C805]/10 text-[#00A804]",
                    sell: "bg-[#FF4444]/10 text-[#CC3333]",
                    spin: "bg-[#6366F1]/10 text-[#6366F1]",
                  };
                  const labelMap: Record<string, string> = {
                    buy: "Buy",
                    sell: "Sell",
                    spin: "Spin",
                  };
                  return (
                    <tr key={`${t.created_at}-${i}`} className="group">
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-black">
                        {t.ticker}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-semibold",
                            colorMap[t.type] ?? "bg-neutral-100 text-neutral-700"
                          )}
                        >
                          {labelMap[t.type] ?? t.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-neutral-700">
                        {t.shares}
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-neutral-700">
                        {formatCurrency(t.price_per_share)}
                      </td>
                      <td className="px-6 py-4 text-left text-sm font-medium text-black">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <SpinModal
        open={spinModalOpen}
        onOpenChange={setSpinModalOpen}
        onSpinComplete={() => router.refresh()}
        canSpin={canSpin}
        nextResetAt={nextResetAt}
        freeSpinsRemaining={freeSpinsRemaining}
      />

      <X2ClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        onClaimComplete={() => router.refresh()}
      />
    </motion.div>
  );
}
