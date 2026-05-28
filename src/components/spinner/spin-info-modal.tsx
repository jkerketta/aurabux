"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Coins, Gift, Zap, RotateCw } from "lucide-react";

interface SpinInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REWARDS = [
  { icon: Coins, label: "500 ABX", color: "text-neutral-600" },
  { icon: Coins, label: "1,000 ABX", color: "text-neutral-600" },
  { icon: Coins, label: "2,500 ABX", color: "text-neutral-600" },
  { icon: Coins, label: "5,000 ABX", color: "text-neutral-600" },
  { icon: Coins, label: "10,000 ABX", color: "text-neutral-600" },
  { icon: Gift, label: "3 Free MAG 7 Shares", color: "text-blue-600", desc: "Random stock from AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA" },
  { icon: Zap, label: "x2 Returns", color: "text-rose-600", desc: "Activates a 24h powerup that doubles your investment gains" },
  { icon: RotateCw, label: "2 Free Spins", color: "text-cyan-600", desc: "Grants 2 extra spins, excluded from pool until daily reset" },
];

export function SpinInfoModal({ open, onOpenChange }: SpinInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#111827]">
            Daily Spin
          </DialogTitle>
          <DialogDescription className="text-sm text-[#4B5563]">
            Spin once a day for a chance at ABX bonuses, free stocks, and powerups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {REWARDS.map((reward, i) => {
            const Icon = reward.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${reward.color}`} />
                <div>
                  <p className="text-sm font-medium text-[#111827]">{reward.label}</p>
                  {reward.desc && (
                    <p className="text-xs text-[#4B5563] mt-0.5">{reward.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
