# ABX-Aurabux Handoff

## Project Overview
Fake stock trading game. Users get **10000 ABX** starting balance, pick real stocks, compete with friends.
**Tech Stack**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase
**UI**: shadcn/ui (new-york style, zinc base, lucide icons), light theme with blue primary (`#2563EB`), glassmorphism accents, animated gradient blobs
**Branch**: `fix/mobile-and-bugs` (off `main`)

---

## Next Goals (Priority Order)

### 1. ~~MVP Feature Complete~~ ✅ DONE
- All core features implemented: trading, spinner, friends, leaderboard, onboarding, light theme.
- Repo is public and ready for deployment.

### 2. ~~Debugging & Stability~~ ✅ DONE (fix/mobile-and-bugs)
- **Error Boundaries**: ✅ Added `ErrorBoundary` component wrapping dashboard, stock detail, leaderboard.
- **Console Cleanup**: ✅ Removed all `console.log`/`console.error` from API routes (18 files).
- **Type Safety**: ✅ Replaced `Record<string, unknown>` with proper types in stock detail page/client.
- **Email Confirmation**: ✅ Added `/auth/confirm` route + `emailRedirectTo` in signup to fix localhost redirect.

### 3. Mobile Responsiveness ✅ DONE (fix/mobile-and-bugs)
- **Navbar**: Hamburger menu for mobile with animated slide-down panel.
- **Dashboard**: Responsive headings, card-based holdings on mobile, responsive page padding.
- **Transaction History**: Card-based layout on mobile (< sm), table on desktop.
- **Stock Detail**: Responsive headings, chart height, button wrapping, container padding.
- **Leaderboard**: Compact rows on mobile, hidden display numbers, smaller text.
- **Search**: Responsive heading, input height, container padding.

### 4. Remaining (Future)
- **Race Conditions**: Add double-submit protection to buy/sell/spin flows.
- **API Fallbacks**: Test Yahoo Finance fallback when Finnhub rate limits.
- **RLS Edge Cases**: Verify users cannot access other users' data directly.
- **Loading States**: Audit all async operations for missing loading states.

---

## Current State

### Working Features
- ✅ Auth (login/signup with email + Google, Supabase SSR)
- ✅ Dashboard: Portfolio Value, ABX Balance, Investments, Holdings, Transactions, Total P&L
- ✅ Stock Search: Debounced search via Finnhub, preserves `?q=` in URL
- ✅ Stock Detail: Chart (1D/1M/1Y/5Y), Buy/Sell panel, Position panel, Company Info, Market Status
- ✅ Buy Flow: Balance validation (hardened for floating-point), holdings upsert, transaction recording, confirmation dialog
- ✅ Sell Flow: Share validation, holdings update/delete, transaction recording, compensation on failure, confirmation dialog
- ✅ Toast Notifications: Sonner (top-center, 3s, white box, black text)
- ✅ Friends System: Friendships table, modal with Friends/Requests tabs, 50 friend max
- ✅ Leaderboard: Global tab only, live price calculation, crown for #1, gold/silver/bronze ranks
- ✅ Navbar Dropdown: Username + display_number trigger, Friends modal, Sign out
- ✅ Portfolio auto-create on first buy (service role bypasses RLS)
- ✅ Canadian stocks (.TO) blocked at search, buy, and sell level
- ✅ Holdings table: Clickable rows, simplified 2-column layout
- ✅ Transactions table: Left-aligned, tinted badges (Buy/Sell/Spin)
- ✅ Performance: In-memory caching for all stock API routes (30s-1hr TTL)
- ✅ Daily Spinner: CSGO-style horizontal animation, 8 rewards, x2 powerup, free spins, info modal
- ✅ Skeleton Loading: Shimmer animation on all page transitions (linear timing, 2.5s duration)
- ✅ Onboarding: Multi-step modal for new users (3 steps, DB-persisted dismissal), re-openable via "How it works"
- ✅ Transaction History: Paginated table (5/page, year in dates, prev/next navigation)
- ✅ Stock Detail: Last updated timestamp, refresh button, chart retry, input focus rings, market status badge
- ✅ Chart Formatting: Range-aware x-axis labels (time for 1D, month+year for 1Y/5Y)
- ✅ Micro-UI: Navbar active state, card hover shadows, input focus rings, loading opacity
- ✅ All-Time Return: Accurate ROI based on total_invested (not hardcoded baseline)
- ✅ Floating Navbar: Glassmorphism capsule, centered, animated underline
- ✅ Login/Signup: Animated gradient blobs (cyan/purple/green) + glass cards
- ✅ Consistent Page Spacing: All dashboard pages have uniform top padding
- ✅ Light Theme: White base, blue primary (`#2563EB`), glassmorphic stats cards, animated blobs
- ✅ Error Boundaries: Reusable `ErrorBoundary` component wrapping major pages
- ✅ Mobile Responsive: Hamburger navbar, card-based holdings/transactions, responsive stock detail, leaderboard, search
- ✅ Email Confirmation: `/auth/confirm` route handles Supabase email verification links correctly
- ✅ Background: Slight off-white `#f8f9fa` (was `#ffffff`) — makes white cards pop
- ✅ Mobile Blobs: 3 extra centrally-positioned gradient blobs visible on narrow screens
- ✅ Mobile Stats Cards: ABX balance & investments side-by-side with compact text on mobile
- ✅ Mobile Padding: Reduced from `px-8` (32px) to `px-4` (16px) on screens `<640px`
- ✅ Holdings Preview: Dashboard shows first 3 ticker avatars + count with `→` arrow, links to full page
- ✅ Holdings Page: Dedicated `/dashboard/holdings` with back arrow, mobile card + desktop table layouts

### Key Files
| File | Purpose |
|------|---------|
| `src/app/dashboard/page.tsx` | Dashboard server component, fetches portfolio + holdings + live prices + spin status + onboarding flag |
| `src/app/dashboard/dashboard-content.tsx` | Dashboard client UI (stats, holdings, transaction history, spin button, x2 badge, onboarding modal, P&L badge, how to play) |
| `src/app/dashboard/stock/[symbol]/page.tsx` | Stock detail server component (fetches quote, candles, profile, user holding) |
| `src/app/dashboard/stock/[symbol]/stock-detail-client.tsx` | Stock detail client UI (chart, buy/sell panel, position panel, company info, market status, confirmation dialog) |
| `src/app/dashboard/stock/[symbol]/loading.tsx` | Loading skeleton for stock detail page |
| `src/app/dashboard/loading.tsx` | Loading skeleton for dashboard page |
| `src/app/dashboard/leaderboard/loading.tsx` | Loading skeleton for leaderboard page |
| `src/components/skeletons/dashboard-skeleton.tsx` | Per-section dashboard skeleton with staggered delays |
| `src/components/onboarding/onboarding-modal.tsx` | 3-step onboarding modal with framer-motion transitions |
| `src/components/transactions/transaction-history.tsx` | Paginated transaction history component |
| `src/components/trade/trade-confirmation.tsx` | Buy/sell confirmation dialog with cost basis and gain/loss |
| `src/components/spinner/spin-info-modal.tsx` | Daily spin rewards explainer modal |
| `src/components/ui/error-boundary.tsx` | Reusable React error boundary with fallback UI + retry |
| `src/app/auth/confirm/route.ts` | Email confirmation handler — verifies Supabase OTP token and redirects |
| `src/app/api/onboarding/route.ts` | PATCH endpoint to mark onboarding as seen |
| `src/app/api/transactions/route.ts` | GET endpoint with paginated transactions (5/page) |
| `src/app/api/stocks/buy/route.ts` | Buy logic with balance hardening, total_invested tracking |
| `src/app/api/stocks/sell/route.ts` | Sell logic: validate shares, update holdings, record transaction, compensation |
| `src/app/api/spin/route.ts` | Spin status (GET) and execution (POST) |
| `src/app/api/spin/activate/route.ts` | x2 powerup activation with snapshot |
| `src/app/api/spin/claim/route.ts` | x2 powerup claim on expiry |
| `src/components/spinner/spin-modal.tsx` | CSGO-style spinner UI with animation |
| `src/components/spinner/x2-claim-modal.tsx` | Claim results modal (original vs doubled returns) |
| `src/components/ui/skeleton.tsx` | Reusable skeleton component with shimmer |
| `src/lib/spin.ts` | Shared getSpinStatus function (avoids auth cookie issues) |
| `src/app/dashboard/holdings/page.tsx` | Dedicated holdings page with back button, mobile/desktop layouts |
| `src/app/dashboard/holdings/loading.tsx` | Skeleton loader for holdings page |
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
| `supabase/migrations/016_onboarding_flag.sql` | has_seen_onboarding boolean in users table |

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
| Blobs not visibly moving | Translation distances too small relative to blob size + blur | Increased keyframe translations from 40-100px to 150-450px |
| Email confirmation links lead to localhost | No `emailRedirectTo` in signUp + no `/auth/confirm` route handler | Added `/auth/confirm` route that verifies OTP token + `emailRedirectTo: ${origin}/auth/confirm` in signup |

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
- **Framer Motion** — Simple fadeIn animations (`opacity 0→1, y: 10→0, 0.3s`)
- **Sonner** — Toast notifications (top-center, 3s, white box, black text)
- **Light aesthetic** — White base, blue primary (`#2563EB`), glassmorphism stats cards, animated gradient blobs, green `#00C805`/red `#FF4444` for P&L

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
git push             # Push to feat/ui-polish
```

## Environment
Required env vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FINNHUB_API_KEY`

## Database
- Run migrations in Supabase SQL Editor in order: `001` → `002` → `004` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012` → `013` → `014` → `015` → `016`
- `003` was deleted (no longer needed after service role fix)
- **Migration 014** needs to be run manually from Supabase SQL editor (updates handle_new_user trigger to 10000 starting balance)
- **Migration 016** needs to be run manually from Supabase SQL editor (adds has_seen_onboarding to users table)

---

## Session Resume Instructions
When starting a new session:
1. Read this `handoff.md` file
2. Check current branch: `git branch` (should be `fix/mobile-and-bugs` or `main` after merge)
3. Check recent commits: `git log --oneline -15`
4. Check git status: `git status` (should be clean)
5. Pull latest: `git pull origin main`
6. **Remaining Work** (pick one):
   - **Race Conditions**: Add debounce/ref double-submit protection to buy/sell/spin buttons.
   - **API Fallbacks**: Test Yahoo Finance fallback when Finnhub fails/rate limits.
   - **RLS Edge Cases**: Verify users cannot access/modify other users' data.
   - **Loading States**: Audit all async operations for missing loading states.
7. Use `@fixer` for bounded bug fixes, `@oracle` for complex debugging/architecture decisions.
