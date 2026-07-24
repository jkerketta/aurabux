"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";

interface SnapshotPoint {
  snapshot_at: string;
  total_value: number;
}

interface Milestone {
  date: string;
  threshold: number;
  label: string;
}

interface NetWorthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Range = "1m" | "3m" | "1y" | "all";

const RANGES: { key: Range; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "1y", label: "1Y" },
  { key: "all", label: "All" },
];

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

interface ChartPoint {
  date: string;
  value: number;
}

export function NetWorthSheet({ open, onOpenChange }: NetWorthSheetProps) {
  const [range, setRange] = useState<Range>("1m");
  const [data, setData] = useState<ChartPoint[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio/snapshots?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        const chartData: ChartPoint[] = (json.snapshots ?? []).map(
          (s: SnapshotPoint) => ({
            date: s.snapshot_at.slice(0, 10),
            value: s.total_value,
          })
        );
        setData(chartData);
        setMilestones(json.milestones ?? []);
      } else {
        setError("Failed to load portfolio history");
      }
    } catch {
      setError("Failed to load portfolio history");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const startValue = data.length > 0 ? data[0].value : 0;
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;
  const totalReturn = startValue > 0 ? ((currentValue - startValue) / startValue) * 100 : 0;
  const isPositive = currentValue >= startValue;
  const chartColor = isPositive ? "#2563EB" : "#FF4444";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#4B5563]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#FF4444] mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Retry
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#4B5563]">
            No portfolio history yet. Come back after making some trades.
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {/* Range selector */}
            <div className="flex gap-2">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    range === r.key
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    domain={["dataMin - 500", "dataMax + 500"]}
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompact}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric"
                    })}
                    formatter={(value: number) => [`${formatCurrency(value)} ABX`, "Value"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: chartColor }}
                  />

                  {/* Milestone markers */}
                  {milestones.map((m, i) => {
                    const point = data.find(d => d.date >= m.date);
                    if (!point) return null;
                    return (
                      <ReferenceDot
                        key={i}
                        x={point.date}
                        y={point.value}
                        r={6}
                        fill="#F59E0B"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Milestone labels */}
            {milestones.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {milestones.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    🏆 {m.label} ({new Date(m.date).toLocaleDateString()})
                  </span>
                ))}
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 pt-2">
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Start</p>
                <p className="text-sm font-semibold text-[#111827]">{formatCurrency(startValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Current</p>
                <p className="text-sm font-semibold text-[#111827]">{formatCurrency(currentValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Max</p>
                <p className="text-sm font-semibold text-[#111827]">{formatCurrency(maxValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Return</p>
                <p className={cn("text-sm font-semibold", isPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                  {isPositive ? "+" : ""}{totalReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
