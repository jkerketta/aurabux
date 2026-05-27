# Repository Atlas: Aurabux (ABX)

## Project Responsibility
A Next.js 15 + TypeScript + Tailwind v4 fake stock trading game. Users sign up with email (or Google OAuth), receive **10000 ABX** starting balance, pick real stocks, and compete with friends. Features include a daily spinner with 8 rewards (ABX, free stocks, x2 powerup, free spins), multi-step onboarding for new users, paginated transaction history, skeleton loading states with smooth shimmer animation, and accurate ROI tracking via `total_invested`. Dark-themed, minimal UI with custom ABX currency symbol.

## System Entry Points
- `src/app/page.tsx`: Root route — auth check redirects to `/dashboard` or `/login`
- `src/app/layout.tsx`: Root layout with Inter font and global CSS
- `src/middleware.ts`: Supabase SSR cookie handling + route protection
- `package.json`: Dependency manifest and scripts
- `supabase/migrations/001_initial_schema.sql`: Database schema (users, portfolios, RLS, auto-create trigger)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (dark theme, shimmer keyframes) |
| Auth/DB | Supabase (email + Google OAuth, RLS) |
| Runtime | React 19 |
| Charts | Recharts (AreaChart) |
| Animations | Framer Motion (staggered), Sonner (toasts) |
| UI | shadcn/ui (new-york style, zinc base) |

## Directory Map (Aggregated)
| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `src/app/api/` | API route handlers for stock trading (buy/sell/quote/candles/search/profile), friends system, leaderboard, and daily spinner. Implements caching, service role fallback, and compensation patterns. | [View Map](src/app/api/codemap.md) |
| `src/app/dashboard/` | Protected dashboard pages: portfolio overview, leaderboard, stock search, stock detail. Server/client component split, Suspense boundaries, skeleton loading states. | [View Map](src/app/dashboard/codemap.md) |
| `src/components/` | Reusable UI components: shadcn/ui primitives, custom spinner (CSGO-style), friends modal, navbar layout, onboarding modal, transaction history, skeleton loaders. Radix UI + Framer Motion integration. | [View Map](src/components/codemap.md) |
| `src/lib/` | Shared utilities: Supabase client factories (browser/server/admin), in-memory cache with TTL, spin status logic, class merging. | [View Map](src/lib/codemap.md) |
| `src/middleware.ts` | Supabase SSR middleware. Refreshes sessions via cookies, protects `/dashboard`, redirects authenticated users from auth routes. | Inline (single file) |
| `supabase/migrations/` | Database schema migrations (001-016). Tables: users, portfolios, holdings, transactions, friendships, daily_spins, powerups. RLS policies, trigger functions, permission grants. | [View Map](supabase/migrations/codemap.md) |

## Route Map
```
/              → auth check → /dashboard or /login
/login         → email/password + Google sign-in
/signup        → email/password + Google sign-up (auto-creates profile via trigger)
/dashboard     → protected: portfolio overview (ABX balance, total value, daily spin)
/dashboard/leaderboard → global leaderboard with live prices
/dashboard/search      → stock search with debounced input
/dashboard/stock/[symbol] → stock detail with chart, buy/sell, position
```

## API Routes
```
GET/POST  /api/stocks/buy       → Buy stocks with balance validation
GET/POST  /api/stocks/sell      → Sell stocks with share validation
GET       /api/stocks/quote     → Real-time quote (Finnhub → Yahoo fallback)
GET       /api/stocks/candles   → Chart data (Yahoo Finance)
GET       /api/stocks/search    → Stock search (Finnhub)
GET       /api/stocks/profile   → Company profile (Finnhub)
GET/POST  /api/friends          → List friends, send requests
GET       /api/friends/search   → Search users by displayname#002
POST      /api/friends/accept   → Accept friend request
POST      /api/friends/decline  → Decline friend request
POST      /api/friends/remove   → Remove friend
POST      /api/friends/cancel   → Cancel outgoing request
GET       /api/leaderboard      → Global leaderboard with live prices
GET       /api/spin             → Spin status (cooldown, free spins, powerup)
POST      /api/spin             → Execute spin, apply reward
POST      /api/spin/activate    → Activate x2 powerup (snapshot investments)
POST      /api/spin/claim       → Claim expired x2 powerup (double returns)
PATCH     /api/onboarding       → Mark onboarding as seen for current user
GET       /api/transactions     → Paginated transaction history (10/page)
```

## Data Flow
1. User visits `/` → server checks auth → redirects
2. Signup → Supabase auth creates user → DB trigger auto-creates `users` + `portfolios` rows (10000 ABX)
3. Login → Supabase auth validates → middleware sets cookies → dashboard loads
4. Dashboard → server fetches portfolio balance + holdings + live prices + spin status → renders cards
5. Buy/Sell → API validates balance/shares → updates holdings + transactions → `router.refresh()`
6. Daily Spin → API checks cooldown → picks random reward → applies (ABX/stock/powerup/free spins)
7. x2 Powerup → User activates → snapshots investments → 24h countdown → claim doubles returns
8. Leaderboard → API fetches all portfolios + live prices → calculates gain/loss via `total_invested`
9. Onboarding → Dashboard checks `users.has_seen_onboarding` → shows 3-step modal if false → dismiss calls `PATCH /api/onboarding` → sets flag to true

## Key Database Tables
| Table | Purpose |
|-------|---------|
| `users` | User profiles (id, username, display_number, has_seen_onboarding) |
| `portfolios` | ABX balance, total_value, total_invested, free_spins |
| `holdings` | Current stock positions (ticker, shares, avg_buy_price) |
| `transactions` | Permanent record of buys/sells/spins |
| `friendships` | Friend relationships (requester, addressee, status) |
| `daily_spins` | Spin history (reward_type, reward_value, created_at) |
| `powerups` | x2 powerup state (type, claimed, snapshot_value, expires_at) |
