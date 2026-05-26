"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_number: string;
  total_value: number;
  gain_loss_pct: number;
  is_current_user: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFD700] text-sm font-bold text-black">
        {rank}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C0C0C0] text-sm font-bold text-black">
        {rank}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#CD7F32] text-sm font-bold text-black">
        {rank}
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-muted-foreground">
      {rank}
    </span>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-neutral-100 px-4 py-3"
        >
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard?type=global");
      if (res.ok) {
        const result = await res.json();
        setData(result.leaderboard ?? []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const renderRow = (entry: LeaderboardEntry) => (
    <div
      key={entry.user_id}
      className={cn(
        "flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors",
        entry.is_current_user
          ? "border-black bg-neutral-50"
          : "border-neutral-100 hover:bg-neutral-50"
      )}
    >
      {/* Rank */}
      <div className="flex-shrink-0">
        {entry.rank === 1 ? (
          <Crown className="h-5 w-5 text-[#FFD700]" />
        ) : (
          <RankBadge rank={entry.rank} />
        )}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-black truncate">
          {entry.username}
          {entry.display_number && (
            <span className="ml-1.5 text-xs text-neutral-400">
              ({entry.display_number})
            </span>
          )}
          {entry.is_current_user && (
            <Badge variant="outline" className="ml-2 h-5 text-[10px]">
              You
            </Badge>
          )}
        </div>
      </div>

      {/* Value + Return */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-black">
          {formatCurrency(entry.total_value)} ABX
        </p>
        <p
          className={cn(
            "text-xs font-medium",
            entry.gain_loss_pct >= 0 ? "text-[#00C805]" : "text-[#FF4444]"
          )}
        >
          {entry.gain_loss_pct >= 0 ? "+" : ""}
          {entry.gain_loss_pct.toFixed(2)}%
        </p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-black">
        Leaderboard
      </h1>

      {loading ? (
        <LeaderboardSkeleton />
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No players yet. Be the first!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">{data.map(renderRow)}</div>
      )}
    </div>
  );
}
