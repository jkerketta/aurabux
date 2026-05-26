"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, TrendingUp, TrendingDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface X2ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimComplete: () => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function X2ClaimModal({ open, onOpenChange, onClaimComplete }: X2ClaimModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<{
    snapshotValue: number;
    currentValue: number;
    gain: number;
    gainPercent: number;
    doubledGain: number;
    doubledPercent: number;
    extraAmount: number;
    newBalance: number;
  } | null>(null);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/spin/claim", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to claim");
        setClaiming(false);
        return;
      }

      setResult(data);
      onClaimComplete();
    } catch {
      toast.error("Network error");
    } finally {
      setClaiming(false);
    }
  }, [onClaimComplete]);

  const handleClose = useCallback(() => {
    setResult(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const isPositive = result ? result.gain >= 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-rose-500 fill-rose-500" />
            2x Returns Ended
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          /* Pre-claim state */
          <div className="flex flex-col items-center gap-6 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Your 2x Returns powerup has expired. Claim your doubled returns now.
            </p>
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="h-12 gap-2 px-8 text-base bg-black text-white hover:bg-neutral-800"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 fill-white" />
              )}
              {claiming ? "Calculating..." : "Claim Returns"}
            </Button>
          </div>
        ) : (
          /* Post-claim results */
          <div className="flex flex-col gap-5 py-2">
            {/* Summary */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Investments at activation
                </span>
                <span className="text-sm font-semibold text-black">
                  {formatCurrency(result.snapshotValue)} ABX
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Investments at expiry
                </span>
                <span className="text-sm font-semibold text-black">
                  {formatCurrency(result.currentValue)} ABX
                </span>
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Actual return
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isPositive ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isPositive ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(result.gain)} ABX ({isPositive ? "+" : ""}
                      {result.gainPercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doubled result */}
            <div className={cn(
              "rounded-xl border p-4",
              isPositive
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className={cn(
                  "h-4 w-4 fill-current",
                  isPositive ? "text-emerald-600" : "text-red-600"
                )} />
                <span className={cn(
                  "text-sm font-semibold",
                  isPositive ? "text-emerald-700" : "text-red-700"
                )}>
                  2x Doubled Return
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  Doubled return
                </span>
                <div className="flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "text-lg font-bold",
                      isPositive ? "text-emerald-700" : "text-red-700"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(result.doubledGain)} ABX ({isPositive ? "+" : ""}
                    {result.doubledPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className={cn(
                "mt-2 text-xs",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                Extra {isPositive ? "earned" : "lost"}: {isPositive ? "+" : ""}{formatCurrency(result.extraAmount)} ABX
              </div>
            </div>

            {/* Close button */}
            <Button
              onClick={handleClose}
              className="h-12 gap-2 px-8 text-base bg-black text-white hover:bg-neutral-800"
            >
              <Check className="h-4 w-4" />
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
