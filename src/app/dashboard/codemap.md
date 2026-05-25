# src/app/dashboard/

## Responsibility

Protected dashboard area — the authenticated core of the app. Provides four pages:

| Route | Purpose |
|-------|---------|
| `/dashboard` | Portfolio overview: ABX balance, total value, holdings table, recent transactions, daily spin |
| `/dashboard/leaderboard` | Global leaderboard ranked by portfolio total value with gain/loss % |
| `/dashboard/search` | Debounced stock search with URL-synced query params |
| `/dashboard/stock/[symbol]` | Stock detail: live quote, interactive chart (recharts), buy/sell trade panel, position summary |

Auth protection is enforced at two levels: `src/middleware.ts` redirects unauthenticated requests to `/login`, and each server page performs a redundant `supabase.auth.getUser()` check.

## Design

### Server/Client Component Split

Every page follows a **server page → client component** pattern:

- **Server pages** (`page.tsx`) fetch all data that requires auth or server-side context (Supabase queries, internal API route calls via `fetch` with constructed `baseUrl`), then pass typed props down.
- **Client components** handle interactivity: state management, user input, animations, client-side API calls (buy/sell/search), and `router.refresh()` after mutations.

| File | Type | Role |
|------|------|------|
| `page.tsx` | Server | Auth check, Supabase queries, internal API fetches, prop assembly |
| `dashboard-content.tsx` | Client (`"use client"`) | Portfolio UI, framer-motion animations, spin modal, value privacy toggle |
| `stock/[symbol]/page.tsx` | Server | Parallel data fetching (quote + candles + search + profile + user data), fallback logic |
| `stock/[symbol]/stock-detail-client.tsx` | Client | Chart (recharts), buy/sell forms, trade execution, position display |
| `search/page.tsx` | Client | Debounced search, URL param sync, `AnimatePresence` transitions |
| `leaderboard/page.tsx` | Client | Full client-side — fetches leaderboard via `/api/leaderboard` on mount |

### Suspense + Loading Pattern

Each route has a `loading.tsx` that Next.js uses as an automatic Suspense boundary fallback:

- `dashboard/loading.tsx` — skeleton matching the full layout (greeting, portfolio card, stats row, holdings table, transactions table)
- `leaderboard/loading.tsx` — title + 8 skeleton rows
- `stock/[symbol]/loading.tsx` — two-column skeleton (chart area + trade panel + position)

The search page uses an **inline `<Suspense>` boundary** wrapping `SearchPageInner` (which calls `useSearchParams()`), with a custom fallback skeleton. This is necessary because `useSearchParams()` requires a Suspense boundary in Next.js App Router.

### Parallel Data Fetching

The stock detail page demonstrates parallel fetching with `Promise.all`:

```ts
const [quoteRes, candleRes, searchRes, profileRes] = await Promise.all([...])
```

User data (portfolio, holdings) is also fetched in parallel:

```ts
const [portfolioResult, holdingResult, allHoldingsResult] = await Promise.all([...])
```

The dashboard page fetches live prices for holdings in parallel via `Promise.all(pricePromises)`, where each promise calls the internal `/api/stocks/quote` route.

### Skeleton Loading States

All `loading.tsx` files use `@/components/ui/skeleton` with dimensions that mirror the rendered layout. The leaderboard page also has an inline `LeaderboardSkeleton` component for its client-side loading state (separate from the `loading.tsx` Suspense fallback).

### Fallback & Resilience

- Stock detail page derives a **fallback quote from candle data** if the quote API fails but candles have closes
- All internal API fetches have `try/catch` with graceful fallbacks (e.g., `avg_buy_price` used when live price fetch fails)
- Dashboard page wraps `getSpinStatus()` in a try/catch with a sensible default object

## Flow

### Data Flow: Server → Client

```
Server page.tsx
  ├── supabase.auth.getUser() → user identity
  ├── supabase.from("portfolios") → balance, total_invested
  ├── supabase.from("holdings") → positions
  ├── fetch(`${baseUrl}/api/stocks/quote`) → live prices (parallel)
  ├── getSpinStatus() → spin eligibility
  └── <ClientComponent {...enrichedProps} />
        └── Client renders with initial data, handles interactivity
```

### Auth Flow

1. `src/middleware.ts` validates Supabase session cookie, redirects `/dashboard` → `/login` if missing
2. `dashboard/layout.tsx` (server) calls `supabase.auth.getUser()`, fetches `username` + `display_number` for the `<Navbar>`
3. Each `page.tsx` performs its own `supabase.auth.getUser()` as a defense-in-depth check, redirecting to `/login` if null

### Trade Execution Flow (Buy/Sell)

```
StockDetailClient (client)
  ├── Client-side validation (balance check, shares check)
  ├── POST /api/stocks/buy or /api/stocks/sell
  ├── On success: router.refresh() → re-runs server page.tsx queries
  └── toast.success() notification
```

### Search Flow

```
SearchPageInner (client)
  ├── User types → setSearchQuery()
  ├── useEffect syncs query to URL params (router.replace, scroll: false)
  ├── Debounced useEffect (300ms) → fetch /api/stocks/search?q=...
  └── Results rendered with AnimatePresence transitions
  └── Click result → router.push(`/dashboard/stock/${symbol}`)
```

### Live Price Enrichment

The dashboard server page constructs `baseUrl` from the request `host` header to call its own API routes server-side:

```ts
const host = headersList.get("host") ?? "localhost:3000";
const protocol = host.includes("localhost") ? "http" : "https";
const baseUrl = `${protocol}://${host}`;
```

This avoids cookie/auth issues that would occur if the browser client called these routes directly for server-side enrichment. Holdings are enriched with `current_price` before being passed to `DashboardContent`.

## Integration

### Supabase

| Table | Used By | Operations |
|-------|---------|------------|
| `portfolios` | Dashboard page, Stock detail page | Read `abx_balance`, `total_invested` |
| `users` | Dashboard layout, Dashboard page | Read `username`, `display_number` |
| `holdings` | Dashboard page, Stock detail page | Read positions, filter by ticker |
| `transactions` | Dashboard page | Read last 10, ordered by `created_at` desc |

- Uses `createClient()` from `@/lib/supabase/server` (server-side factory)
- RLS policies ensure users only access their own data
- `createAdminClient()` (service role) is NOT used in dashboard pages — all queries run under user context

### API Routes

| Route | Called By | Purpose |
|-------|-----------|---------|
| `/api/stocks/quote` | Dashboard page (server), Stock detail page (server) | Current stock price |
| `/api/stocks/candles` | Stock detail page (server + client on range change) | OHLCV chart data |
| `/api/stocks/search` | Search page (client), Stock detail page (server for company name) | Symbol/description lookup |
| `/api/stocks/profile` | Stock detail page (server) | Company info (market cap, exchange, website) |
| `/api/stocks/buy` | Stock detail client (POST) | Execute buy order |
| `/api/stocks/sell` | Stock detail client (POST) | Execute sell order |
| `/api/leaderboard` | Leaderboard page (client) | Global leaderboard rankings |

### Spinner System

- `getSpinStatus()` from `@/lib/spin` — called server-side in dashboard page
- `<SpinModal>` from `@/components/spinner/spin-modal` — triggered from `DashboardContent`
- `<X2ClaimModal>` from `@/components/spinner/x2-claim-modal` — auto-opens when expired powerup detected
- Spin completion triggers `router.refresh()` to re-fetch server data

### Layout & Navigation

- `dashboard/layout.tsx` wraps all dashboard pages with `<Navbar>` (user info, display number)
- Layout constrains content to `max-w-5xl` with consistent padding
- Navbar provides navigation to `/dashboard`, `/dashboard/leaderboard`, `/dashboard/search`

### UI Primitives

- shadcn/ui: `Card`, `Button`, `Badge`, `Input`, `Skeleton`
- framer-motion: `motion.div` with staggered container/item variants (dashboard), `AnimatePresence` (search)
- recharts: `AreaChart` with gradient fill (stock detail)
- lucide-react: icons throughout
- sonner: `toast` for trade confirmations
