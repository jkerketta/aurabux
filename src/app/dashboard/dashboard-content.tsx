"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { RotateCw, Zap, Clock } from "lucide-react";
import { SpinModal } from "@/components/spinner/spin-modal";
import { X2ClaimModal } from "@/components/spinner/x2-claim-modal";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { TransactionHistory } from "@/components/transactions/transaction-history";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
}

interface Transaction {
  ticker: string;
  type: "buy" | "sell" | "spin";
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
  hasSeenOnboarding: boolean;
  canSpin: boolean;
  hasActivePowerup: boolean;
  activePowerupExpiresAt: string | null;
  hasExpiredPowerup: boolean;
  nextResetAt: string | null;
  freeSpinsRemaining: number;
}

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
    year: "numeric",
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
  hasSeenOnboarding,
  canSpin,
  hasActivePowerup,
  activePowerupExpiresAt,
  hasExpiredPowerup,
  nextResetAt,
  freeSpinsRemaining,
}: DashboardContentProps) {
  const router = useRouter();
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

  // All-time portfolio return: based on total invested, not hardcoded 1000
  const investmentsValue = holdings.reduce((sum, h) => sum + h.shares * h.current_price, 0);
  const allTimeReturn = totalInvested > 0 ? ((investmentsValue - totalInvested) / totalInvested) * 100 : 0;
  const isAllTimePositive = allTimeReturn >= 0;

  return (
    <>
      {/* Animated gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 65%)",
            filter: "blur(100px)",
            animation: "blob1 20s ease-in-out infinite",
            opacity: 0.7,
          }}
        />
        <div
          className="absolute top-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 65%)",
            filter: "blur(100px)",
            animation: "blob2 25s ease-in-out infinite",
            opacity: 0.7,
          }}
        />
        <div
          className="absolute -bottom-[10%] left-[10%] w-[75vw] h-[75vw] max-w-[850px] max-h-[850px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 65%)",
            filter: "blur(100px)",
            animation: "blob3 22s ease-in-out infinite",
            opacity: 0.6,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pb-20"
      >
      {/* Greeting Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-[#111827]">
          {greeting}, {username || "Trader"}
        </h1>
        <p className="mt-1 text-sm text-[#4B5563]">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </motion.div>

      {/* Portfolio Value Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Card className="backdrop-blur-xl bg-white/60 border border-white/40 shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Portfolio Value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-5xl font-bold tracking-tight text-[#111827]">
                {formatCurrency(initialTotalValue)} ABX
              </p>
            </CardContent>
          </Card>
        </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid gap-4 sm:grid-cols-2 mb-8">
        {/* ABX Balance Card */}
          <Card className="min-h-[120px] backdrop-blur-xl bg-white/60 border border-white/40 shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                ABX Balance
              </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[#2563EB]">
              {formatCurrency(initialBalance)} <span className="text-lg font-normal text-[#4B5563]">ABX</span>
            </p>
            <div className="mt-3">
              <div
                className={cn(
                  "relative inline-flex items-center gap-2 cursor-pointer rounded-md px-3 py-1.5 transition-colors",
                  canSpin ? "bg-[#2563EB] text-white hover:bg-blue-700" : "bg-transparent text-neutral-300"
                )}
                onClick={() => setSpinModalOpen(true)}
              >
                <RotateCw className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
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
          <Card className="min-h-[120px] backdrop-blur-xl bg-white/60 border border-white/40 shadow-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider text-[#4B5563]">
                Investments
              </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight text-[#111827]">
              {formatCurrency(investmentsValue)} <span className="text-lg font-normal text-[#4B5563]">ABX</span>
            </p>
            <div className="mt-2">
              <div className={cn(
                "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
                isAllTimePositive ? "bg-[#00C805]/10 text-[#00A804]" : "bg-[#FF4444]/10 text-[#CC3333]"
              )}>
                {isAllTimePositive ? "+" : ""}{allTimeReturn.toFixed(2)}% all time
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Holdings Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-[#111827]">Holdings</h2>
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
            <Card className="bg-white border-[#E5E7EB] shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-[#111827]">No holdings yet</p>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Start trading to build your portfolio
                </p>
              </CardContent>
            </Card>
        ) : (
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              <table className="w-full">
                <tbody className="divide-y divide-[#E5E7EB]">
                  {holdings.map((h) => {
                    const currentValue = h.shares * h.current_price;
                    const costBasis = h.shares * h.avg_buy_price;
                    const pnl = currentValue - costBasis;
                    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                    const isPnlPositive = pnl >= 0;
                    return (
                      <tr
                        key={h.ticker}
                        className="group cursor-pointer hover:bg-[#F9FAFB]"
                        onClick={() => router.push(`/dashboard/stock/${h.ticker}`)}
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#111827]">{h.ticker}</p>
                          <p className="text-xs text-[#4B5563]">{formatShares(h.shares)} share{formatShares(h.shares) !== "1" ? "s" : ""}</p>
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

      {/* Transaction History Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[#111827]">
          Transaction History
        </h2>
        <div className="rounded-lg border border-[#E5E7EB] bg-white">
          <TransactionHistory initialTransactions={transactions} />
        </div>
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

      <OnboardingModal
        open={!hasSeenOnboarding}
        onOpenChange={(open) => {
          if (!open) {
            router.refresh();
          }
        }}
      />
    </motion.div>
    </>
  );
}
