# Holdings UX + Bklit UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Fix clickable holdings table rows, add Finnhub logos, and add Bklit donut chart to holdings page.

**Architecture:** Server components fetch prices + logos in parallel, pass to new client components (HoldingsTable, HoldingsDonut) for interactivity.

**Tech Stack:** Next.js 15, Bklit UI (via shadcn registry), Finnhub profile2 API, Recharts (unchanged).

## Global Constraints

- Follow existing shadcn/ui patterns (new-york style)
- Keep server components unless interactivity needed
- Logo fallback: initials when no logo from Finnhub or image fails
- Profile API: backward compatible (add `logo` field)
- No unrelated refactoring

---

### Task 1: Expose `logo` in profile API

**Files:**
- Modify: `src/app/api/stocks/profile/route.ts:69-73`

- [ ] Add `logo` to the result object

Change:
```ts
const result = {
  marketCap: ... ? ... * 1_000_000 : null,
  exchange: data.exchange ?? null,
  weburl: data.weburl ?? null,
};
```
To:
```ts
const result = {
  marketCap: ... ? ... * 1_000_000 : null,
  exchange: data.exchange ?? null,
  weburl: data.weburl ?? null,
  logo: data.logo ?? null,
};
```

- [ ] Commit: `git add src/app/api/stocks/profile/route.ts && git commit -m "feat(api): expose logo field in stock profile endpoint"`

### Task 2: Set up Bklit UI registry + install pie chart

**Files:**
- Modify: `components.json`
- Modify: `src/app/globals.css`
- (auto-generated: `@bklit/pie-chart` components)

- [ ] Add `@bklit` registry to `components.json`

Add after `"iconLibrary": "lucide"` (with comma):
```json
"registries": {
  "@bklit": "https://ui.bklit.com/r/{name}.json"
}
```

- [ ] Add chart color CSS variables to `src/app/globals.css`

Add inside the `@theme` block after `--font-family-sans`:
```css
--color-chart-1: #2563eb;
--color-chart-2: #16a34a;
--color-chart-3: #dc2626;
--color-chart-4: #f59e0b;
--color-chart-5: #8b5cf6;
```

Add Bklit-required :root custom properties after the `@theme` block:
```css
:root {
  --chart-1: var(--color-chart-1);
  --chart-2: var(--color-chart-2);
  --chart-3: var(--color-chart-3);
  --chart-4: var(--color-chart-4);
  --chart-5: var(--color-chart-5);
}
```

- [ ] Install Bklit pie chart:

```bash
npx shadcn@latest add @bklit/pie-chart
```

- [ ] Commit: `git add components.json src/app/globals.css && git commit -m "feat: add Bklit UI registry and pie chart"`

### Task 3: Create HoldingsDonut component

**Files:**
- Create: `src/components/holdings/holdings-donut.tsx`
- Dependencies: Bklit PieChart, PieSlice, PieCenter, Legend

- [ ] Create client component for the donut chart

```tsx
"use client";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
}

interface HoldingsDonutProps {
  holdings: Holding[];
  balance: number;
  totalValue: number;
}

export function HoldingsDonut({ holdings, balance, totalValue }: HoldingsDonutProps) {
  const data = [
    ...holdings.map((h, i) => ({
      label: h.ticker,
      value: h.shares * h.current_price,
      color: `var(--chart-${(i % 5) + 1})`,
    })),
    ...(balance > 0
      ? [{ label: "Cash", value: balance, color: "var(--color-muted-foreground)" }]
      : []),
  ];

  return (
    <PieChart data={data} size={280} innerRadius={80} cornerRadius={4}>
      {data.map((_, index) => (
        <PieSlice key={index} index={index} />
      ))}
      <PieCenter defaultLabel="Portfolio" />
      <Legend />
    </PieChart>
  );
}
```

- [ ] Commit: `git add -A && git commit -m "feat: add HoldingsDonut component using Bklit UI"`

### Task 4: Create HoldingsTable client component

**Files:**
- Create: `src/components/holdings/holdings-table.tsx`

- [ ] Create a client component wrapping the desktop table with clickable rows

```tsx
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface Holding {
  ticker: string;
  shares: number;
  avg_buy_price: number;
  current_price: number;
  logo: string | null;
}

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const router = useRouter();

  return (
    <div className="hidden md:block overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#E5E7EB]">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Ticker</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Shares</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Avg Buy</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#4B5563]">Current</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">Value</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-[#4B5563]">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB]">
          {holdings.map((h) => {
            const currentValue = h.shares * h.current_price;
            const costBasis = h.shares * h.avg_buy_price;
            const pnl = currentValue - costBasis;
            const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
            const isPnlPositive = pnl >= 0;
            return (
              <tr
                key={h.ticker}
                onClick={() => router.push(`/dashboard/stock/${h.ticker}`)}
                className="cursor-pointer hover:bg-[#F9FAFB] transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {h.logo ? (
                      <img
                        src={h.logo}
                        alt={h.ticker}
                        className="h-7 w-7 rounded-full object-contain"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const fallback = target.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`${h.logo ? "hidden" : "flex"} h-7 w-7 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-semibold text-[#111827]`}
                    >
                      {h.ticker.slice(0, 2)}
                    </div>
                    <span className="text-sm font-semibold text-[#111827]">{h.ticker}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[#111827]">{formatShares(h.shares)}</td>
                <td className="px-6 py-4 text-sm text-[#4B5563]">{formatCurrency(h.avg_buy_price)}</td>
                <td className="px-6 py-4 text-sm text-[#4B5563]">{formatCurrency(h.current_price)}</td>
                <td className="px-6 py-4 text-right text-sm font-medium text-[#111827]">{formatCurrency(currentValue)} ABX</td>
                <td className="px-6 py-4 text-right">
                  <p className={cn("text-sm font-medium", isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                    {isPnlPositive ? "+" : ""}{formatCurrency(pnl)}
                  </p>
                  <p className={cn("text-xs", isPnlPositive ? "text-[#00C805]" : "text-[#FF4444]")}>
                    ({isPnlPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShares(value: number): string {
  const rounded = Math.round(value * 10000) / 10000;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
```

- [ ] Commit: `git add src/components/holdings/holdings-table.tsx && git commit -m "feat: create HoldingsTable client component with clickable rows and logos"`

### Task 5: Update holdings page with donut chart + logos + clickable table

**Files:**
- Modify: `src/app/dashboard/holdings/page.tsx`

- [ ] Add parallel logo fetching, pass to HoldingsTable + HoldingsDonut

Replace the page content with:
- Fetch logos in parallel alongside prices
- Pass everything to the client components
- Add donut chart above the table
- Remove old inline table, use HoldingsTable instead

- [ ] Commit: `git add src/app/dashboard/holdings/page.tsx && git commit -m "feat: add donut chart and logos to holdings page"`

### Task 6: Update dashboard page with logo circles

**Files:**
- Modify: `src/app/dashboard/page.tsx` — parallel logo fetch + pass to DashboardContent
- Modify: `src/app/dashboard/dashboard-content.tsx` — replace initials with logos

- [ ] Add logo fetching to dashboard server page
- [ ] Update DashboardContent to render logos with fallback

- [ ] Commit: `git add src/app/dashboard/page.tsx src/app/dashboard/dashboard-content.tsx && git commit -m "feat: show stock logos on dashboard portfolio card"`

### Task 7: Build verification

- [ ] Run `npm run build` and fix any issues
- [ ] Run `npm run lint` and fix any issues
