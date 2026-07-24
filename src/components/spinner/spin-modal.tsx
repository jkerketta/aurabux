"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion, useAnimationControls } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X, RotateCw, Check, Ban, Clock, Ticket, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpinComplete: () => void;
  canSpin: boolean;
  nextResetAt: string | null;
  freeSpinsRemaining: number;
  currentStreak?: number;
  streakBonusPct?: number;
}

const REWARD_SLOTS = [
  { type: "abx", value: "500", label: "500 ABX", color: "bg-neutral-100", textColor: "text-neutral-700", icon: "🪙" },
  { type: "abx", value: "1000", label: "1000 ABX", color: "bg-neutral-100", textColor: "text-neutral-700", icon: "🪙" },
  { type: "abx", value: "2500", label: "2500 ABX", color: "bg-blue-50", textColor: "text-blue-700", icon: "💎" },
  { type: "abx", value: "5000", label: "5000 ABX", color: "bg-purple-50", textColor: "text-purple-700", icon: "💎" },
  { type: "abx", value: "10000", label: "10000 ABX", color: "bg-amber-50", textColor: "text-amber-700", icon: "👑" },
  { type: "stock", value: "AAPL", label: "3 Free Shares", color: "bg-emerald-50", textColor: "text-emerald-700", icon: "📈" },
  { type: "powerup_x2", value: "x2", label: "x2 Returns", color: "bg-rose-50", textColor: "text-rose-700", icon: "⚡" },
  { type: "free_spins", value: "2", label: "2 Free Spins", color: "bg-cyan-50", textColor: "text-cyan-700", icon: "🎰" },
];

const CARD_WIDTH = 160;
const CARD_GAP = 12;
const STRIP_LENGTH = 60;
const SPIN_DURATION = 5;

function buildStrip(winningIndex: number) {
  const strip: (typeof REWARD_SLOTS)[0][] = [];
  for (let i = 0; i < STRIP_LENGTH; i++) {
    if (i === STRIP_LENGTH - 10) {
      strip.push(REWARD_SLOTS[winningIndex]);
    } else {
      strip.push(REWARD_SLOTS[i % REWARD_SLOTS.length]);
    }
  }
  return strip;
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SpinModal({ open, onOpenChange, onSpinComplete, canSpin, nextResetAt, freeSpinsRemaining, currentStreak = 0, streakBonusPct = 0 }: SpinModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ label: string; type: string; value: string } | null>(null);
  const [strip, setStrip] = useState<(typeof REWARD_SLOTS)[0][]>([]);
  const [activating, setActivating] = useState(false);
  const [, setTick] = useState(0);
  const controls = useAnimationControls();
  const spinningRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const isOnCooldown = !canSpin && freeSpinsRemaining === 0;

  // Force re-render every second so countdown updates live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Compute countdown directly from nextResetAt — always fresh on every render
  const countdownMs = nextResetAt ? new Date(nextResetAt).getTime() - Date.now() : 0;
  const countdownText = countdownMs > 0 ? formatCountdown(countdownMs) : "";

  const handleSpin = useCallback(async () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setResult(null);

    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Spin failed");
        setSpinning(false);
        spinningRef.current = false;
        return;
      }

      const reward = data.reward;
      let winSlotIndex = REWARD_SLOTS.findIndex(
        (s) => s.type === reward.type && s.value === reward.value
      );
      if (winSlotIndex === -1 && reward.type === "stock") {
        winSlotIndex = REWARD_SLOTS.findIndex((s) => s.type === "stock");
      }
      const finalIndex = winSlotIndex >= 0 ? winSlotIndex : 0;

      const newStrip = buildStrip(finalIndex);
      setStrip(newStrip);

      const winPos = STRIP_LENGTH - 10;
      const viewportWidth = viewportRef.current?.offsetWidth ?? 500;
      // Random offset within ±40% of card width (±64px) so pointer lands anywhere on the winning card
      const randomOffset = (Math.random() - 0.5) * 128;
      const targetOffset = -(winPos * (CARD_WIDTH + CARD_GAP)) + (viewportWidth / 2) - (CARD_WIDTH / 2) + randomOffset;

      controls.set({ x: 0 });
      await controls.start({
        x: targetOffset,
        transition: {
          duration: SPIN_DURATION,
          ease: [0.15, 0.85, 0.35, 1],
        },
      });

      setResult({ label: reward.label, type: reward.type, value: reward.value });
      toast.success(`You won: ${reward.label}!`);
      onSpinComplete();
    } catch {
      toast.error("Network error");
    } finally {
      setSpinning(false);
      spinningRef.current = false;
    }
  }, [controls, onSpinComplete]);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    try {
      const res = await fetch("/api/spin/activate", { method: "POST" });
      if (res.ok) {
        toast.success("x2 Returns activated!");
        onSpinComplete();
        onOpenChange(false);
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to activate");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActivating(false);
    }
  }, [onSpinComplete, onOpenChange]);

  const handleReject = useCallback(() => {
    toast.info("x2 Returns declined");
    onSpinComplete();
    onOpenChange(false);
  }, [onSpinComplete, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSpinning(false);
      setResult(null);
      setStrip([]);
      spinningRef.current = false;
      controls.set({ x: 0 });
    }
  }, [open, controls]);

  const isX2Reward = result?.type === "powerup_x2";
  const isFreeSpinsReward = result?.type === "free_spins";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" showCloseButton={!spinning}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            Daily Spin
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Streak badge */}
          {currentStreak > 0 && !spinning && !result && (
            <div className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1">
              <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
              <span className="text-xs font-semibold text-orange-700">{currentStreak}-day streak</span>
              {streakBonusPct > 0 && (
                <span className="text-xs text-orange-500 ml-0.5">(+{streakBonusPct}% bonus)</span>
              )}
            </div>
          )}

          {/* Free spins counter */}
          {freeSpinsRemaining > 0 && !spinning && !result && (
            <div className="flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2">
              <Ticket className="h-4 w-4 text-cyan-600" />
              <span className="text-sm font-semibold text-cyan-700">
                {freeSpinsRemaining} free spin{freeSpinsRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>
          )}

          {/* Countdown timer — shown when on cooldown and no result */}
          {isOnCooldown && countdownText && !spinning && !result && (
            <div className="flex flex-col items-center gap-2">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <p className="text-2xl font-bold tracking-tight text-[#111827]">
                {countdownText}
              </p>
              <p className="text-xs text-muted-foreground">
                Next spin available at reset
              </p>
            </div>
          )}

          {/* Spinner viewport — only shown during/after spin */}
          {(spinning || result || strip.length > 0) && (
            <div className="relative w-full">
              {/* Center pointer — above the viewport, not clipped */}
              <div className="absolute left-1/2 -top-1 z-20 -translate-x-1/2">
                <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
                  <path d="M10 12L0 0H20L10 12Z" fill="#171717" />
                </svg>
              </div>

              {/* Viewport */}
              <div
                ref={viewportRef}
                className="relative h-[104px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
              >
                {/* Center highlight */}
                <div className="absolute left-1/2 top-0 z-0 h-full w-[172px] -translate-x-1/2 border-x-2 border-black/10" />

                {/* Strip */}
                <div className="absolute left-0 top-4 flex">
                  <motion.div
                    animate={controls}
                    className="flex"
                    style={{ willChange: "transform" }}
                  >
                    {strip.map((slot, i) => (
                      <div
                        key={i}
                        className={`flex flex-shrink-0 items-center justify-center rounded-lg ${slot.color} ${slot.textColor} font-semibold text-sm`}
                        style={{
                          width: CARD_WIDTH,
                          height: 80,
                          marginRight: i < strip.length - 1 ? CARD_GAP : 0,
                        }}
                      >
                        <span className="text-xl mr-2">{slot.icon}</span>
                        {slot.label}
                      </div>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          )}

          {/* Spin button — always rendered, disabled when on cooldown */}
          {!spinning && !result && (
            <Button
              onClick={handleSpin}
              disabled={isOnCooldown}
              className={cn(
                "h-12 gap-2 px-8 text-base rounded-md",
                isOnCooldown
                  ? "bg-[#E5E7EB] text-[#4B5563] cursor-not-allowed hover:bg-[#E5E7EB]"
                  : "bg-[#2563EB] text-white hover:bg-blue-700"
              )}
            >
              <RotateCw className="h-5 w-5" />
              Spin Now
            </Button>
          )}

          {spinning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Spinning...
            </div>
          )}

          {/* Result — ABX, Stock, or Free Spins */}
          {result && !isX2Reward && !isFreeSpinsReward && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-semibold text-black">
                You won: {result.label}
              </p>
            </div>
          )}

          {/* Result — Free Spins */}
          {result && isFreeSpinsReward && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-semibold text-black">
                You won: {result.label}!
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                You can spin again immediately. The "2 Free Spins" reward is removed from the pool until tomorrow's reset.
              </p>
            </div>
          )}

          {/* x2 Reward — accept/reject */}
          {result && isX2Reward && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg font-semibold text-black">
                You won: {result.label}
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Double your portfolio returns for 24 hours. The bonus is applied at the next daily reset.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleActivate}
                  disabled={activating}
                  className="h-10 gap-2 bg-black text-white hover:bg-neutral-800"
                >
                  {activating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Activate
                </Button>
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="h-10 gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
