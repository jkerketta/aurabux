# API Routes: `src/app/api/`

## Responsibility

API route handlers for the fake stock trading game. Provides RESTful endpoints for:
- **Stock trading** — buy/sell shares with balance validation, holding upserts, and transaction recording
- **Market data** — real-time quotes, candlestick charts, stock search, and company profiles via Finnhub + Yahoo Finance
- **Social features** — friend requests, friendship management, and user search by display name
- **Leaderboard** — global and friends-only rankings with live portfolio valuation
- **Daily spinner** — spin-to-win rewards (ABX, free shares, powerups) with cooldown management and x2 returns activation/claim

## Design Patterns

### Route Handler Pattern
All routes use Next.js 15 App Router `Route Handlers` (`export async function GET/POST`). Authentication is performed via `createClient().auth.getUser()` at the start of each handler, returning `401` for unauthenticated requests. Request body parsing is wrapped in try/catch with `400` for invalid JSON.

### Dual Supabase Client Strategy
- **`createClient()`** — user-scoped client respecting RLS policies. Used for reads/writes to user-owned data (holdings, transactions, friendships).
- **`createAdminClient()`** — service role client bypassing RLS. Used for admin operations: portfolio auto-healing (buy/sell), leaderboard aggregation (cross-user queries), and spin reward application.

### Compensation Pattern for Transactions
Buy and sell routes implement a two-phase commit with compensation:
1. **Phase 1** — Update portfolio balance (deduct for buy, credit for sell)
2. **Phase 2** — Upsert holding + record transaction (inside try/catch)
3. **Compensation** — If Phase 2 fails, revert portfolio balance to original value before re-throwing

This ensures atomicity without database transactions (Supabase edge functions don't support multi-statement transactions).

### In-Memory Cache with TTL
`@/lib/cache` provides a singleton `Map`-based cache with per-key TTL. Each route checks cache before making external API calls. Cache keys are namespaced by operation type:
- `quote:${SYMBOL}` — stock quote data
- `candles:${SYMBOL}:${RANGE}` — OHLC candlestick data
- `search:${QUERY}` — stock search results
- `profile:${SYMBOL}` — company profile metadata
- `price:${TICKER}` — single price lookup (used by leaderboard)

### Fallback Chain for Market Data
Quote endpoint uses a primary→fallback strategy:
1. **Finnhub** (primary) — fast, structured quote data. `403` triggers fallback (free tier limitation for non-US stocks).
2. **Yahoo Finance** (fallback) — browser-emulated requests with `User-Agent` headers. Used when Finnhub returns `403`, `c === 0`, or no API key is configured.

### Internal API Calls
Leaderboard and spin routes make internal `fetch()` calls to `/api/stocks/quote` for live pricing. Base URL is constructed from the incoming request's `Host` header (`http://` for localhost, `https://` otherwise).

## Data & Control Flow

### Stock Buy (`POST /api/stocks/buy`)
```
Request { symbol, shares, pricePerShare }
  → Auth check (401 if missing)
  → Validate body fields (400 if invalid)
  → Normalize symbol (uppercase, reject .TO)
  → Fetch portfolio via admin client (auto-heal if missing: insert 10000 ABX)
  → Check balance (rounded to 2 decimals) vs total cost (400 if insufficient)
  → Phase 1: Deduct balance, increment total_invested
  → Phase 2: Upsert holding (update avg_buy_price weighted average OR insert new)
  → Phase 2: Insert transaction record
  → Compensation: revert balance + total_invested on Phase 2 failure
  → Response { success, balance, shares_bought, symbol, total_cost }
```

### Stock Sell (`POST /api/stocks/sell`)
```
Request { symbol, shares, pricePerShare }
  → Auth check
  → Validate body fields
  → Normalize symbol (reject .TO)
  → Fetch holding for user+symbol (400 if not owned)
  → Check owned shares >= requested (400 if insufficient)
  → Fetch portfolio via admin client (auto-heal if missing)
  → Calculate proceeds, new balance, new total_invested (max(0, ...))
  → Phase 1: Credit balance, decrement total_invested
  → Phase 2: Delete holding (if 0 remaining) OR update shares
  → Phase 2: Insert transaction record
  → Compensation: revert balance + total_invested on Phase 2 failure
  → Response { success, balance, shares_sold, symbol, proceeds }
```

### Stock Quote (`GET /api/stocks/quote?symbol=...`)
```
Query param: symbol
  → Validate symbol (400 if missing)
  → Check cache (return cached if hit)
  → Try Finnhub API → 403/empty → fallback to Yahoo
  → Yahoo Finance with browser headers
  → Normalize response to { symbol, currentPrice, change, changePercent, high, low, open, previousClose }
  → Cache with TTL.QUOTE (30s)
  → Response { ...normalized quote } or 404
```

### Stock Candles (`GET /api/stocks/candles?symbol=...&range=1D|1M|1Y|5Y`)
```
Query params: symbol, range (default: 1D)
  → Validate symbol (400 if missing), range (400 if invalid)
  → Check cache (return cached if hit)
  → Yahoo Finance v8 chart API with mapped interval/range
  → Parse timestamps + closes, filter nulls (holidays/weekends)
  → Return { timestamps, closes, status: "ok"|"no_data" }
  → Cache with TTL.CANDLES (60s)
```

### Stock Search (`GET /api/stocks/search?q=...`)
```
Query param: q
  → Return empty results if no query
  → Check cache (return cached if hit)
  → Finnhub search API
  → Map results to { symbol, description, displaySymbol, type }
  → Filter out .TO (Canadian) stocks
  → Cache with TTL.SEARCH (5min)
  → Response { results: [...] }
```

### Stock Profile (`GET /api/stocks/profile?symbol=...`)
```
Query param: symbol
  → Validate symbol (400 if missing)
  → Check cache (return cached if hit)
  → Finnhub profile2 API
  → 403/404/empty → return { marketCap: null, exchange: null, weburl: null }
  → Normalize: marketCap * 1_000_000 (Finnhub returns in millions)
  → Cache with TTL.PROFILE (1 hour)
  → Response { marketCap, exchange, weburl }
```

### Friends (`GET/POST /api/friends`)
```
GET:
  → Auth check
  → Query friendships where user is requester OR addressee
  → Classify into: friends (accepted), incoming (pending, user is addressee), outgoing (pending, user is requester)
  → Response { friends, incoming, outgoing }

POST /api/friends/request:
  → Auth check, validate username
  → Parse displayname#002 format (extract username before #)
  → Lookup target user by username (404 if not found)
  → Prevent self-request (400)
  → Check existing friendship: accepted (400), pending (400), declined (re-send by updating row)
  → Check friend count limit (50 max) (400 if exceeded)
  → Insert friendship row (requester_id = current user, status = "pending")
  → Response { success: true, status: "pending" }
```

### Friends Search (`GET /api/friends/search?q=...`)
```
Query param: q (format: displayname#002)
  → Auth check
  → Require # in query (return empty if missing)
  → Split into username + display_number
  → Exact match on users.username + users.display_number (exclude self)
  → Check existing friendship status
  → Response { results: [{ id, username, display_number, friendship_status }] }
```

### Leaderboard (`GET /api/leaderboard?type=global|friends`)
```
Query param: type (default: "global")
  → Auth check
  → Build base URL from request Host header
  → If "friends": fetch accepted friendships → collect user IDs → fetch portfolios + holdings for friends
  → If "global": fetch top 100 portfolios by balance → fetch all holdings
  → Collect unique tickers across all holdings
  → Fetch prices in parallel via internal /api/stocks/quote calls (cached per ticker)
  → Calculate total_value = abx_balance + Σ(shares × price)
  → Calculate gain_loss_pct = ((total_value - total_invested) / total_invested) × 100
  → Sort by total_value descending
  → Fetch usernames for all users
  → Response { leaderboard: [{ rank, user_id, username, display_number, total_value, gain_loss_pct, is_current_user }] }
```

### Spin (`GET/POST /api/spin`)
```
GET:
  → Auth check
  → Delegate to getSpinStatus(user.id) from @/lib/spin
  → Response { canSpin, nextResetAt, freeSpinsRemaining, ... }

POST:
  → Auth check
  → Check cooldown (daily reset at 21:00 UTC), bypassed if free_spins > 0
  → Build reward pool (exclude "free_spins" if already won today, exclude "x2" if active powerup exists)
  → Random selection from pool
  → Record spin in daily_spins table FIRST
  → Decrement free_spins if used
  → Apply reward:
    - abx: credit balance
    - stock: pick random from STOCK_TICKERS, fetch price, upsert holding (3 shares, avg_buy_price = current), record transaction
    - free_spins: add 2 to portfolio.free_spins
    - powerup_x2: no auto-application (user activates via /api/spin/activate)
  → Response { reward, canSpin: false, nextResetAt, freeSpinsRemaining }
```

### Spin Activate (`POST /api/spin/activate`)
```
  → Auth check
  → Verify unclaimed x2 spin exists in current cycle (since last reset)
  → Verify no active unclaimed x2 powerup already exists in current cycle
  → Snapshot current investments value (fetch all holdings, parallel quote lookups)
  → Insert powerup row: type=x2_returns, snapshot_value=current value, expires_at=now+24h, claimed=false
  → Response { success: true, snapshotValue }
```

### Spin Claim (`POST /api/spin/claim`)
```
  → Auth check
  → Find expired unclaimed x2 powerup (expires_at < now)
  → Fetch current investments value (parallel quote lookups)
  → Calculate gain = currentValue - snapshotValue
  → Credit/debit extraAmount (= gain) to ABX balance
  → Mark powerup as claimed
  → Response { snapshotValue, currentValue, gain, gainPercent, doubledGain, doubledPercent, extraAmount, newBalance }
```

## Integration Points

| External Service | Used By | Purpose |
|-----------------|---------|---------|
| **Finnhub API** (`finnhub.io/api/v1`) | quote, search, profile | Real-time stock quotes, symbol search, company metadata. Requires `FINNHUB_API_KEY` env var. |
| **Yahoo Finance** (`query1.finance.yahoo.com`) | quote (fallback), candles | Quote fallback for non-US stocks, candlestick OHLC data. No API key required; uses browser-emulated headers. |
| **Supabase Auth** | All routes | User authentication via `auth.getUser()`. Session managed by SSR middleware cookies. |
| **Supabase DB (user client)** | buy, sell, friends, spin | RLS-scoped operations on holdings, transactions, friendships, daily_spins. |
| **Supabase DB (admin client)** | buy, sell, leaderboard, spin | RLS-bypassed operations: portfolio auto-healing, cross-user leaderboard queries, spin reward application. |
| **@/lib/cache** | quote, candles, search, profile, leaderboard | In-memory TTL cache singleton. Reduces external API calls. Serverless-safe (per-instance). |
| **@/lib/spin** | spin GET | Spin status calculation (cooldown, free spins, reset times). |
| **Internal `/api/stocks/quote`** | leaderboard, spin, activate, claim | Live price fetching via internal `fetch()` calls. Constructed base URL from request `Host` header. |

## Cache TTL Configuration

| Key Pattern | TTL | Rationale |
|-------------|-----|-----------|
| `quote:${SYMBOL}` | 30 seconds | Real-time prices change frequently; short TTL balances freshness vs API rate limits |
| `candles:${SYMBOL}:${RANGE}` | 60 seconds | Historical data changes less frequently; 1D candles update every 5 minutes |
| `search:${QUERY}` | 5 minutes | Symbol listings are relatively static |
| `profile:${SYMBOL}` | 1 hour | Company metadata (exchange, market cap, website) rarely changes |
| `price:${TICKER}` | 30 seconds | Reuses QUOTE TTL; used by leaderboard for parallel price lookups |

## Database Tables Referenced

| Table | Operations | Routes |
|-------|-----------|--------|
| `portfolios` | SELECT, UPDATE, INSERT | buy, sell, spin, activate, claim, leaderboard |
| `holdings` | SELECT, INSERT, UPDATE, DELETE | buy, sell, spin, activate, claim, leaderboard |
| `transactions` | INSERT | buy, sell, spin |
| `friendships` | SELECT, INSERT, UPDATE | friends, friends/search, leaderboard |
| `users` | SELECT | friends, friends/search, leaderboard |
| `daily_spins` | SELECT, INSERT | spin, activate |
| `powerups` | SELECT, INSERT, UPDATE | spin, activate, claim |
