# ABX-Aurabux Handoff

## Project Overview
Fake stock trading game. Users get **10000 ABX** starting balance, pick real stocks, compete with friends.
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

### 2. ~~Portfolio Total Value with Live Prices~~ ✅ DONE
- Dashboard and stock detail page both fetch live prices for all holdings
- `total_value = abx_balance + Σ(shares × current_price)`
- Investments card now shows current value (not cost basis)

### 3. ~~Social & Competition Phase~~ ✅ DONE
- **Database**: `supabase/migrations/006_social.sql`
  - `friendships` table with requester/addressee/status
  - `users.display_number` column (#000, #001, etc.)
  - Auto-assign via trigger, backfill existing users
  - RLS policies for friendships CRUD
- **Friends System**:
  - API routes: `/api/friends` (list, request), `/api/friends/accept`, `/api/friends/decline`, `/api/friends/remove`, `/api/friends/cancel`, `/api/friends/search`
  - Friends modal via navbar dropdown (2 tabs: Friends, Requests)
  - Requests tab: search bar with format validation (`displayname#002`), send button, incoming/outgoing sections
  - 50 friend max, exact match search, friendship status indicators
- **Leaderboard**:
  - API: `/api/leaderboard?type=global` with live price calculation
  - Page: `/dashboard/leaderboard` (Global only, no Friends tab)
  - Crown icon for rank 1, gold/silver/bronze badges for 2/3
  - Current user highlight, gain/loss %

### 4. ~~Daily Spinner Feature~~ ✅ DONE
- **Database**: `supabase/migrations/008_daily_spinner.sql` (daily_spins, powerups tables)
  - `supabase/migrations/009_grant_spinner_permissions.sql` (service_role grants)
  - `supabase/migrations/010_free_spins.sql` (free_spins column in portfolios)
  - `supabase/migrations/011_powerup_snapshot.sql` (snapshot_value column)
  - `supabase/migrations/012_fix_spinner_constraint.sql` (free_spins in check constraint)
  - `supabase/migrations/015_add_spin_transactions.sql` (spin type in transactions)
- **Rewards** (equal probability, 8 types): 500/1000/2500/5000/10000 ABX, 3 Free MAG 7 Shares, x2 Returns, 2 Free Spins
- **API Routes**:
  - `GET /api/spin` — spin status (cooldown, free spins, powerup state)
  - `POST /api/spin` — execute spin, apply reward
  - `POST /api/spin/activate` — activate x2 powerup (snapshots investments value)
  - `POST /api/spin/claim` — claim expired x2 powerup (doubles returns)
- **UI**: `src/components/spinner/spin-modal.tsx` (CSGO-style horizontal spinner), `src/components/spinner/x2-claim-modal.tsx`
- **x2 Powerup**: Manual activation, 24h countdown badge next to Holdings, claim modal on expiry, excluded from reward pool if active
- **Free Spins**: "2 Free Spins" reward grants 2 extra spins, excluded from pool until daily reset
- **Free Stock**: 3 shares of random MAG 7 stock (AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA), avg_buy_price set to current price
- **Spin Transactions**: Type "spin" appears in recent transactions with current price and total

### 5. ~~Skeleton Loading States~~ ✅ DONE
- `src/components/ui/skeleton.tsx` — reusable Skeleton component with shimmer animation
- `src/app/globals.css` — shimmer keyframes + skeleton colors
- `src/app/dashboard/loading.tsx` — dashboard skeleton
- `src/app/dashboard/leaderboard/loading.tsx` — leaderboard skeleton
- `src/app/dashboard/stock/[symbol]/loading.tsx` — stock detail skeleton
- `src/app/dashboard/search/page.tsx` — Suspense fallback with skeleton
- `src/app/dashboard/leaderboard/page.tsx` — inline skeleton replaced with component

### 6. ~~total_invested Tracking for Accurate ROI~~ ✅ DONE
- **Database**: `supabase/migrations/013_total_invested.sql` (total_invested column in portfolios)
- **Buy Route**: Increments total_invested by totalCost on purchase
- **Sell Route**: Decrements total_invested by costBasis (shares × avg_buy_price) on sale
- **All-Time Return**: `(investmentsValue - totalInvested) / totalInvested × 100`
- **Leaderboard**: Uses total_invested for gain/loss % instead of hardcoded 1000
- **Buy Hardening**: Floating-point comparison fixed (rounded to 2 decimals before balance check)

### 7. ~~Starting Balance 10000~~ ✅ DONE
- **Database**: `supabase/migrations/014_starting_balance_10000.sql` (updates handle_new_user trigger + column defaults)
- **Migration 001**: Updated in-place (abx_balance default 10000, total_invested column)
- **All fallbacks**: Updated across all routes (1000 → 10000)

### 8. End-of-Day Portfolio Recalculation (DEFERRED)
- Not implemented. Would require Supabase Edge Function + cron
- For now, total value is calculated on each page load

---

## Current State

### Working Features
- ✅ Auth (login/signup with email + Google, Supabase SSR)
- ✅ Dashboard: Portfolio Value, ABX Balance, Investments, Holdings, Transactions
- ✅ Stock Search: Debounced search via Finnhub, preserves `?q=` in URL
- ✅ Stock Detail: Chart (1D/1M/1Y/5Y), Buy/Sell panel, Position panel, Company Info
- ✅ Buy Flow: Balance validation (hardened for floating-point), holdings upsert, transaction recording
- ✅ Sell Flow: Share validation, holdings update/delete, transaction recording, compensation on failure
- ✅ Toast Notifications: Sonner (top-center, 3s, white box, black text)
- ✅ Friends System: Friendships table, modal with Friends/Requests tabs, 50 friend max
- ✅ Leaderboard: Global tab only, live price calculation, crown for #1, gold/silver/bronze ranks
- ✅ Navbar Dropdown: Username + display_number trigger, Friends modal, Sign out
- ✅ Portfolio auto-create on first buy (service role bypasses RLS)
- ✅ Canadian stocks (.TO) blocked at search, buy, and sell level
- ✅ Holdings table: Clickable rows, simplified 2-column layout
- ✅ Transactions table: Left-aligned, tinted badges (Buy/Sell/Spin)
- ✅ Eye icon: Hides values with dots, fixed card heights
- ✅ Performance: In-memory caching for all stock API routes (30s-1hr TTL)
- ✅ Daily Spinner: CSGO-style horizontal animation, 8 rewards, x2 powerup, free spins
- ✅ Skeleton Loading: Shimmer animation on all page transitions
- ✅ All-Time Return: Accurate ROI based on total_invested (not hardcoded baseline)

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/page.tsx` | Dashboard server component, fetches portfolio + holdings + live prices + spin status |
| `src/app/dashboard/dashboard-content.tsx` | Dashboard client UI (stats, holdings, transactions, spin button, x2 badge) |
| `src/app/dashboard/stock/[symbol]/page.tsx` | Stock detail server component (fetches quote, candles, profile, user holding) |
| `src/app/dashboard/stock/[symbol]/stock-detail-client.tsx` | Stock detail client UI (chart, buy/sell panel, position panel, company info) |
| `src/app/dashboard/stock/[symbol]/loading.tsx` | Loading skeleton for stock detail page |
| `src/app/dashboard/loading.tsx` | Loading skeleton for dashboard page |
| `src/app/dashboard/leaderboard/loading.tsx` | Loading skeleton for leaderboard page |
| `src/app/api/stocks/buy/route.ts` | Buy logic with balance hardening, total_invested tracking |
| `src/app/api/stocks/sell/route.ts` | Sell logic: validate shares, update holdings, record transaction, compensation |
| `src/app/api/spin/route.ts` | Spin status (GET) and execution (POST) |
| `src/app/api/spin/activate/route.ts` | x2 powerup activation with snapshot |
| `src/app/api/spin/claim/route.ts` | x2 powerup claim on expiry |
| `src/components/spinner/spin-modal.tsx` | CSGO-style spinner UI with animation |
| `src/components/spinner/x2-claim-modal.tsx` | Claim results modal (original vs doubled returns) |
| `src/components/ui/skeleton.tsx` | Reusable skeleton component with shimmer |
| `src/lib/spin.ts` | Shared getSpinStatus function (avoids auth cookie issues) |
| `src/lib/cache.ts` | In-memory cache with TTL for API responses |
| `src/app/api/friends/route.ts` | Friends list + send request API (with username parsing fix) |
| `src/app/api/friends/search/route.ts` | Search users by exact `displayname#002` format |
| `src/app/api/leaderboard/route.ts` | Leaderboard with total_invested-based gain/loss |
| `src/components/friends/friends-modal.tsx` | Friends modal with Friends/Requests tabs |
| `src/app/dashboard/leaderboard/page.tsx` | Leaderboard page (Global only) |
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
| `supabase/migrations/006_social.sql` | Friendships table, display_number, RLS policies |
| `supabase/migrations/007_allow_user_lookup.sql` | Allow user lookup by username |
| `supabase/migrations/008_daily_spinner.sql` | daily_spins + powerups tables |
| `supabase/migrations/009_grant_spinner_permissions.sql` | Service role grants for spinner tables |
| `supabase/migrations/010_free_spins.sql` | free_spins column in portfolios |
| `supabase/migrations/011_powerup_snapshot.sql` | snapshot_value column in powerups |
| `supabase/migrations/012_fix_spinner_constraint.sql` | free_spins in check constraint |
| `supabase/migrations/013_total_invested.sql` | total_invested column in portfolios |
| `supabase/migrations/014_starting_balance_10000.sql` | Updated handle_new_user trigger + defaults |
| `supabase/migrations/015_add_spin_transactions.sql` | spin type in transactions check constraint |

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
| Next.js 9.3.3 in package.json | Wrong version, doesn't support App Router | Changed to `^15.1.0` |
| `next.config.ts` not supported | Next.js 15.1.0 doesn't support `.ts` config | Renamed to `next.config.js` |
| Sequence START value < MINVALUE | PostgreSQL sequence defaults minvalue=1 | Added `minvalue 0` to sequence creation |
| Insufficient balance on exact float match | IEEE 754 floating-point drift in `shares * pricePerShare` | Round both balance and cost to 2 decimals before comparison |
| Auth cookie bug in spin status | Self-fetch from server component loses auth cookies | Extracted shared `getSpinStatus` function in `src/lib/spin.ts` |
| x2 powerup double-activation | Missing `.eq("claimed", false)` check | Added claimed check to activation route |
| Cooldown timer stuck | useState/useEffect timing bug | Moved to computed value from nextResetAt with 1s tick re-render |

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
- **shadcn/ui** — Card, Button, Input, Badge, Dialog, DropdownMenu, Tabs primitives at `@/components/ui/`
- **Recharts** — AreaChart for stock price visualization
- **Framer Motion** — Staggered animations on dashboard sections
- **Sonner** — Toast notifications (top-center, 3s, white box, black text)
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
- Run migrations in Supabase SQL Editor in order: `001` → `002` → `004` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012` → `013` → `014` → `015`
- `003` was deleted (no longer needed after service role fix)
- **Migration 014** needs to be run manually from Supabase SQL editor (updates handle_new_user trigger to 10000 starting balance)

---

## Session Resume Instructions
When starting a new session:
1. Read this `handoff.md` file
2. Check current branch: `git branch` (should be `feat/stock-search`)
3. Check recent commits: `git log --oneline -5`
4. Next task: Run migration 014 from Supabase SQL editor, then push branch
5. Use `@fixer` for bounded implementation work, `@oracle` for architecture decisions
