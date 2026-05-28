"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TradeConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  type: "buy" | "sell";
  symbol: string;
  shares: number;
  pricePerShare: number;
  total: number;
  remainingBalance?: number;
  costBasis?: number;
  gainLoss?: number;
  gainLossPercent?: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function TradeConfirmation({
  open,
  onOpenChange,
  onConfirm,
  type,
  symbol,
  shares,
  pricePerShare,
  total,
  remainingBalance,
  costBasis,
  gainLoss,
  gainLossPercent,
}: TradeConfirmationProps) {
  const isGain = gainLoss !== undefined && gainLoss >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#111827]">
            Confirm {type === "buy" ? "Purchase" : "Sale"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Trade summary */}
          <div className="space-y-2">
            <p className="text-sm text-[#4B5563]">
              {type === "buy" ? "Buy" : "Sell"}{" "}
              <span className="font-semibold text-[#111827]">{shares} share{shares !== 1 ? "s" : ""}</span>{" "}
              of <span className="font-semibold text-[#111827]">{symbol}</span>
            </p>
            <p className="text-sm text-[#4B5563]">
              at <span className="font-semibold text-[#111827]">${formatCurrency(pricePerShare)}</span> per share
            </p>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
            <span className="text-sm font-medium text-[#4B5563]">Total</span>
            <span className="text-lg font-bold text-[#111827]">${formatCurrency(total)}</span>
          </div>

          {/* Buy: remaining balance */}
          {type === "buy" && remainingBalance !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#4B5563]">Remaining balance</span>
              <span className="text-sm font-semibold text-[#111827]">{formatCurrency(remainingBalance)} ABX</span>
            </div>
          )}

          {/* Sell: cost basis + gain/loss */}
          {type === "sell" && costBasis !== undefined && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#4B5563]">Cost basis</span>
                <span className="text-sm text-[#111827]">${formatCurrency(costBasis)}</span>
              </div>
              {gainLoss !== undefined && gainLossPercent !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#4B5563]">
                    {isGain ? "Gain" : "Loss"}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isGain ? "text-[#00C805]" : "text-[#FF4444]"
                    )}
                  >
                    {isGain ? "+" : ""}${formatCurrency(Math.abs(gainLoss))} ({isGain ? "+" : ""}{gainLossPercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="flex-1 bg-[#2563EB] text-white hover:bg-blue-700"
          >
            Confirm {type === "buy" ? "Buy" : "Sell"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
