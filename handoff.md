# ABX-Aurabux Handoff

## Project Overview
Fake stock trading game. Users get 1000 ABX starting balance, pick real stocks, compete with friends.
**Tech Stack**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase
**UI**: shadcn/ui (new-york style, zinc base, lucide icons), dark-themed minimal UI
**Branch**: `feat/stock-search`

---

## Next Goals (Priority Order)

### 1. ~~Sell Feature~~ ✅ DONE
- **API Route**: `src/app/api/stocks/sell/route.ts`
  - Validates user owns the stock and has enough shares
  - Deducts shares from `holdings` table (deletes row if shares = 0)
  - Adds ABX back to `portfolios.abx_balance`
  - Records transaction in `transactions` table with `type: "sell"`
  - Compensation pattern: reverts balance if holdings/txn fails
  - Blocks `.TO` Canadian stocks
- **UI**: Buy/Sell toggle in trading panel (`stock-detail-client.tsx`)
  - Sell button disabled/grayed out when user has no position
  - Mode toggle: "Shares to sell" or "ABX to receive"
  - Shows available shares to sell
  - Toast notification on success (top-center, 3s, white box, black text)
  - `router.refresh()` after buy/sell to refetch server data

### 2. Portfolio Total Value with Live Prices
- Currently `initialTotalValue` passed to dashboard is calculated on server
- Dashboard server component (`src/app/dashboard/page.tsx`) fetches live prices for all holdings
- `total_value = abx_balance + Σ(shares × current_price)`
- Works but may be slow with many holdings (parallel fetches help)

### 3. End-of-Day Portfolio Recalculation (DEFERRED)
- Not implemented. Would require Supabase Edge Function + cron
- For now, total value is calculated on each page load

---

## Current State

### Working Features
- ✅ Auth (login/signup with email + Google, Supabase SSR)
- ✅ Dashboard: Portfolio Value, ABX Balance, Investments, Holdings, Transactions
- ✅ Stock Search: Debounced search via Finnhub, preserves `?q=` in URL
- ✅ Stock Detail: Chart (1D/1M/1Y/5Y), Buy panel, Position panel, Company Info
- ✅ Buy Flow: Balance validation, holdings upsert, transaction recording
- ✅ Sell Flow: Share validation, holdings update/delete, transaction recording, compensation on failure
- ✅ Toast Notifications: Sonner (top-center, 3s, white box, black text)
- ✅ Portfolio auto-create on first buy (service role bypasses RLS)
- ✅ Canadian stocks (.TO) blocked at search and buy level
- ✅ Holdings table: Clickable rows, simplified 2-column layout
- ✅ Transactions table: Left-aligned, tinted badges
- ✅ Eye icon: Hides values with dots, fixed card heights

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/page.tsx` | Dashboard server component, fetches portfolio + holdings + live prices |
| `src/app/dashboard/dashboard-content.tsx` | Dashboard client UI (stats, holdings, transactions) |
| `src/app/dashboard/stock/[symbol]/page.tsx` | Stock detail server component (fetches quote, candles, profile, user holding) |
| `src/app/dashboard/stock/[symbol]/stock-detail-client.tsx` | Stock detail client UI (chart, buy panel, position panel, company info) |
| `src/app/api/stocks/buy/route.ts` | Buy logic with service role fallback for portfolio creation |
| `src/app/api/stocks/sell/route.ts` | Sell logic: validate shares, update holdings, record transaction, compensation |
| `src/app/api/stocks/quote/route.ts` | Quote API: Finnhub → Yahoo fallback chain |
| `src/app/api/stocks/candles/route.ts` | Chart data via Yahoo Finance `/v8/finance/chart` |
| `src/app/api/stocks/search/route.ts` | Search via Finnhub, filters out .TO stocks |
| `src/app/api/stocks/profile/route.ts` | Company profile via Finnhub `/stock/profile2` |
| `src/lib/supabase/server.ts` | User-scoped Supabase client (SSR cookies) |
| `src/lib/supabase/admin.ts` | Service role client (bypasses RLS) |
| `src/lib/supabase/client.ts` | Browser client (client components only) |
| `supabase/migrations/001_initial_schema.sql` | Users + portfolios tables, RLS, auto-create trigger |
| `supabase/migrations/002_holdings_and_transactions.sql` | Holdings + transactions tables, RLS |
| `supabase/migrations/004_grant_service_role_permissions.sql` | GRANT table permissions to service_role |
| `supabase/migrations/005_grant_authenticated_permissions.sql` | GRANT table permissions to authenticated |

---

## What Failed & Workarounds

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| "Failed to initialize portfolio" on buy | RLS blocked INSERT, then unique constraint on duplicate | Use `createAdminClient()` (service role) for portfolio auto-create |
| `permission denied for table portfolios` (service_role) | Supabase tables lack GRANT for service_role role | Migration `004_grant_service_role_permissions.sql` |
| `permission denied for table portfolios` (authenticated) | Same issue for logged-in user role | Migration `005_grant_authenticated_permissions.sql` |
| Canadian stocks return 403 from Finnhub | Free tier only supports US stocks | Block `.TO` tickers at search and buy level |
| Yahoo Finance returns 404 for some symbols | Unofficial API, occasional blocking | Return `{ status: "no_data" }` gracefully, no retry |
| Market cap shows millions instead of trillions | Finnhub `marketCapitalization` is in millions | Multiply by `1_000_000` in profile route |
| Webpack runtime error on specific tickers | Server component passed invalid data to client | Price fallback from candles when quote APIs fail |
| LSP errors on Windows | UNC paths (`\\wsl.localhost\...`) break module resolution | Run builds/commands via `wsl -d Ubuntu -- bash -c "..."` |

---

## What Works Best

### Architecture
- **Server components by default** — fetch Supabase data + call internal APIs in parallel
- **Service role client** — only for admin operations (portfolio auto-create), never exposed to browser
- **User-scoped client** — for all user data operations (holdings, transactions, balance updates)
- **Internal API routes** — server components call `/api/stocks/*` via `fetch()` with `baseUrl`

### Data Sources
- **Finnhub** — Search (`/search`), Quote (`/quote`), Profile (`/stock/profile2`). Free tier: US stocks only.
- **Yahoo Finance** — Candles (`/v8/finance/chart`), Quote fallback (`/v7/finance/quote`). Requires browser headers.
- **Supabase** — Auth, portfolios, holdings, transactions. RLS enforced on user-scoped client.

### UI Patterns
- **Tailwind CSS v4** — Uses `@tailwindcss/postcss` plugin, no `tailwind.config.js`
- **shadcn/ui** — Card, Button, Input, Badge primitives at `@/components/ui/`
- **Recharts** — AreaChart for stock price visualization
- **Framer Motion** — Staggered animations on dashboard sections
- **Wealthsimple aesthetic** — Monotone base, green `#00C805`/red `#FF4444` for P&L, tinted pills

---

## What Doesn't Work Well

- **Finnhub free tier** — No Canadian stocks, no `/stock/candle` endpoint, rate limited
- **Yahoo Finance unofficial API** — Can change without notice, requires specific headers
- **RLS + Service Role** — Need both GRANT permissions AND RLS policies; easy to miss one
- **Windows + WSL** — UNC paths break LSP and some tooling; always use `wsl -d Ubuntu -- bash -c "..."` for commands
- **No test framework** — Manual testing only; consider adding Vitest/Playwright later

---

## Commands

```bash
# Dev
npm run dev          # Start dev server (run from WSL: wsl -d Ubuntu -- bash -c "cd /home/jose/projects/ABX-Aurabux- && npm run dev")

# Build
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

# Git
git push             # Push to feat/stock-search
```

## Environment
Required env vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FINNHUB_API_KEY`

## Database
- Run migrations in Supabase SQL Editor in order: `001` → `002` → `004` → `005`
- `003` was deleted (no longer needed after service role fix)

---

## Session Resume Instructions
When starting a new session:
1. Read this `handoff.md` file
2. Check current branch: `git branch` (should be `feat/stock-search`)
3. Check recent commits: `git log --oneline -5`
4. Next task: Implement Sell feature (see "Next Goals" above)
5. Use `@fixer` for bounded implementation work, `@oracle` for architecture decisions
