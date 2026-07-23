# v1.1 — Holdings UX Improvements + Bklit UI

## Overview

Three changes to the holdings experience:
1. **Fix:** Desktop table rows on `/dashboard/holdings` are not clickable — add navigation to stock detail
2. **Logos:** Show company logos (from Finnhub profile2) next to tickers on both the dashboard portfolio card and the holdings page table
3. **Donut chart:** Add a Bklit UI donut chart at the top of `/dashboard/holdings` showing portfolio allocation by value (holdings + cash)

## Changes

### 1. Profile API — expose `logo`

`src/app/api/stocks/profile/route.ts`: Add `logo: data.logo ?? null` to the returned result object. The `FinnhubProfileResponse` type already declares `logo?: string` — no new type changes. Backward compatible.

### 2. Dashboard page — logo fetching

`src/app/dashboard/page.tsx`: Fetch logos from `/api/stocks/profile` in parallel alongside the existing quote fetches. Add `logo` field to `enrichedHoldings`. Enriched type becomes:
```ts
{ ticker, shares, avg_buy_price, current_price, logo }
```

`src/app/dashboard/dashboard-content.tsx`: Replace ticker-initial circles in the holdings card (shows first 3 holdings) with `<img>` tags. Fallback on `onError` to the existing initials.

### 3. Holdings page — logo fetching, clickable rows, donut chart

**Logo fetching:** Same pattern as dashboard — parallel profile fetches, add `logo` to enriched holdings.

**Clickable rows:** Convert desktop table to a client component `HoldingsTable` that uses `useRouter` + `router.push(…)` on row click. Keep the mobile card layout as-is (already uses `<Link>`).

**Donut chart:** New client component `HoldingsDonut` installed via `npx shadcn@latest add @bklit/pie-chart`. Receives `holdings[]` + `balance` + `totalValue`. Builds data with one slice per holding + one "Cash" slice. Uses `<PieChart innerRadius={80}>` with legend. Placed above the table on `/dashboard/holdings`.

### 4. CSS — chart color variables

Add `:root { --chart-1: ... }` variables and `@theme` colors for the Bklit chart palette (5 colors).

### 5. shadcn registry

Add `@bklit` registry to `components.json`.

## Edge cases

- No logo from Finnhub → fallback to ticker initials (current behavior)
- Logo image 404 → `onError` hides `<img>`, shows initials
- No holdings → donut not rendered, "No holdings yet" card shown
- Profile API 403/404 → returns `logo: null`, no crash
- Many holdings (>5) → chart colors cycle
