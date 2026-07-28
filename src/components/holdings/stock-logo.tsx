"use client";

import { cn } from "@/lib/utils";

interface StockLogoProps {
  logo: string | null;
  ticker: string;
  size?: "sm" | "md";
}

export function StockLogo({ logo, ticker, size = "md" }: StockLogoProps) {
  const sizeClasses = size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-xs";

  return (
    <div className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] border-2 border-white overflow-hidden", sizeClasses)}>
      {logo ? (
        <img
          src={logo}
          alt={ticker}
          className="h-full w-full object-contain"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            const fallback = img.nextElementSibling;
            if (fallback) (fallback as HTMLElement).style.display = "flex";
          }}
        />
      ) : null}
      <div
        className={cn(
          "h-full w-full items-center justify-center font-semibold text-[#111827]",
          logo ? "hidden" : "flex"
        )}
      >
        {ticker.slice(0, 2)}
      </div>
    </div>
  );
}
