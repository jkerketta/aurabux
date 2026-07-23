"use client";

import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import type { PieData } from "@/components/charts/pie-context";
import { cn } from "@/lib/utils";

interface Holding {
  ticker: string;
  shares: number;
  current_price: number;
}

interface HoldingsDonutProps {
  holdings: Holding[];
  balance: number;
  totalValue: number;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function HoldingsDonut({ holdings, balance, totalValue }: HoldingsDonutProps) {
  const slices: PieData[] = [
    ...holdings.map((h, i) => ({
      label: h.ticker,
      value: Math.round(h.shares * h.current_price * 100) / 100,
      color: CHART_COLORS[i % CHART_COLORS.length],
    })),
    ...(balance > 0
      ? [{ label: "Cash", value: balance, color: "#9CA3AF" }]
      : []),
  ];

  if (slices.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <PieChart data={slices} size={260} innerRadius={85} cornerRadius={4}>
        {slices.map((_, index) => (
          <PieSlice key={index} index={index} />
        ))}
        <PieCenter
          defaultLabel="Portfolio"
          prefix="$"
          formatOptions={{
            notation: "compact",
            maximumFractionDigits: 0,
          }}
        />
      </PieChart>

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {slices.map((slice) => {
          const pct = totalValue > 0 ? ((slice.value / totalValue) * 100) : 0;
          return (
            <div key={slice.label} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm text-[#4B5563]">{slice.label}</span>
              <span className="text-sm font-medium text-[#111827]">
                {pct < 0.1 ? "<0.1%" : `${pct.toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
