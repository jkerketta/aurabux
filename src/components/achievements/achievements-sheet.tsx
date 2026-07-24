"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Award } from "lucide-react";
import { AchievementBadge } from "./achievement-badge";

interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementsSheet({ open, onOpenChange }: AchievementsSheetProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/achievements");
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements);
      } else {
        setError("Failed to load achievements");
      }
    } catch {
      setError("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchAchievements();
    }
  }, [open, fetchAchievements]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#4B5563]" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#FF4444] mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAchievements}
              className="border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-y-auto">
            <p className="text-sm text-[#4B5563] mb-4 text-center">
              {unlockedCount} / {achievements.length} achievements unlocked
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
              {achievements.map((a) => (
                <AchievementBadge key={a.key} achievement={a as Achievement & { unlocked: boolean; unlocked_at: string | null }} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
