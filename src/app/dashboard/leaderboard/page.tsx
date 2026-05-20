"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, Trophy, Users } from "lucide-react";

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
          <div className="h-7 w-7 rounded-full bg-neutral-100" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-24 rounded bg-neutral-100" />
            <div className="h-3 w-12 rounded bg-neutral-100" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-4 w-20 rounded bg-neutral-100" />
            <div className="h-3 w-16 rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [globalData, setGlobalData] = useState<LeaderboardEntry[]>([]);
  const [friendsData, setFriendsData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const fetchLeaderboard = useCallback(async (type: "global" | "friends") => {
    if (type === "friends") {
      setFriendsLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/leaderboard?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "friends") {
          setFriendsData(data.leaderboard ?? []);
        } else {
          setGlobalData(data.leaderboard ?? []);
        }
      }
    } catch {
      // silent fail
    } finally {
      if (type === "friends") {
        setFriendsLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard("global");
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
        {entry.rank === 1 && (
          <Trophy className="h-5 w-5 text-[#FFD700]" />
        )}
        {entry.rank !== 1 && <RankBadge rank={entry.rank} />}
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">
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
        </p>
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

      <Tabs defaultValue="global" onValueChange={(v) => {
        if (v === "friends" && friendsData.length === 0) {
          fetchLeaderboard("friends");
        }
      }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          {loading ? (
            <LeaderboardSkeleton />
          ) : globalData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No players yet. Be the first!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {globalData.map(renderRow)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends">
          {friendsLoading ? (
            <LeaderboardSkeleton />
          ) : friendsData.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-black">
                  No friends yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add friends to see how you compare
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {friendsData.map(renderRow)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
