"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/holdings/stock-logo";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
  logo: string | null;
}

interface HoldingsTableProps {
  holdings: Holding[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShares(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const router = useRouter();

  return (
    <div className="hidden md:block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Ticker</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Shares</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Avg Buy</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Current</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">Value</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">P&L</th>
          </tr>
        </thead>
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
                onClick={() => router.push(`/dashboard/stock/${h.ticker}`)}
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <StockLogo logo={h.logo} ticker={h.ticker} size="sm" />
                    <span className="text-sm font-semibold text-[#111827]">{h.ticker}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#111827]">{formatShares(h.shares)}</td>
                <td className="px-6 py-4 text-sm text-[#4B5563]">{formatCurrency(h.avg_buy_price)}</td>
                <td className="px-6 py-4 text-sm text-[#4B5563]">{formatCurrency(h.current_price)}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[#111827]">{formatCurrency(currentValue)} ABX</td>
                <td className="px-6 py-4 text-right">
                  <p className={cn("text-sm font-medium", isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                    {isPnlPositive ? "+" : ""}{formatCurrency(pnl)}
                  </p>
                  <p className={cn("text-xs", isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                    ({isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
