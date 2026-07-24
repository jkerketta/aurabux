"use client";

import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
interface AchievementBadgeProps {
  achievement: {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    unlocked: boolean;
    unlocked_at: string | null;
  };
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coins: LucideIcons.Coins,
  Activity: LucideIcons.Activity,
  TrendingUp: LucideIcons.TrendingUp,
  Landmark: LucideIcons.Landmark,
  Star: LucideIcons.Star,
  Award: LucideIcons.Award,
  Trophy: LucideIcons.Trophy,
  Crown: LucideIcons.Crown,
  Leaf: LucideIcons.Leaf,
  Rocket: LucideIcons.Rocket,
  Gem: LucideIcons.Gem,
  Flame: LucideIcons.Flame,
  RotateCw: LucideIcons.RotateCw,
  LayoutGrid: LucideIcons.LayoutGrid,
};

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const Icon = iconMap[achievement.icon] || LucideIcons.Award;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
        achievement.unlocked
          ? "bg-white border-[#E5E7EB]"
          : "bg-[#F9FAFB] border-[#E5E7EB]/50 opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          achievement.unlocked ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-[#F3F4F6] text-[#9CA3AF]"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className={cn("text-xs font-semibold", achievement.unlocked ? "text-[#111827]" : "text-[#4B5563]")}>
          {achievement.title}
        </p>
        {achievement.unlocked ? (
          <p className="text-[10px] text-[#4B5563] mt-0.5">
            {new Date(achievement.unlocked_at!).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{achievement.description}</p>
        )}
      </div>
    </div>
  );
}
