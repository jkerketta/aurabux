# src/lib/

## Responsibility
Shared utility layer providing infrastructure clients, caching, game logic, and UI helpers. Houses Supabase client factories (browser, server, admin), an in-memory TTL cache, daily spin status computation, and Tailwind class merging.

## File Map
| File | Responsibility |
|------|----------------|
| `supabase/client.ts` | Browser-side Supabase client factory via `createBrowserClient` |
| `supabase/server.ts` | Server-side Supabase client factory via `createServerClient` with cookie persistence |
| `supabase/admin.ts` | Service-role Supabase client factory (bypasses RLS) for admin operations |
| `cache.ts` | Singleton in-memory cache with TTL expiration and domain-specific TTL constants |
| `spin.ts` | Daily spin status computation — reset windows, powerup state, free spins |
| `utils.ts` | Tailwind class merging utility (`cn`) via `clsx` + `tailwind-merge` |

## Design Patterns

### Factory Pattern — Supabase Clients
Three distinct factory functions produce Supabase clients scoped to their execution context:
- **`createClient()` in `client.ts`** — returns a browser-compatible client using `createBrowserClient(@supabase/ssr)`. Used in client components where `window` is available.
- **`createClient()` in `server.ts`** — async factory returning a server-scoped client via `createServerClient(@supabase/ssr)`. Integrates with Next.js `cookies()` API for session persistence across server requests.
- **`createAdminClient()` in `admin.ts`** — synchronous factory using raw `createClient(@supabase/supabase-js)` with `SUPABASE_SERVICE_ROLE_KEY`. Bypasses Row Level Security for privileged operations (e.g., auto-creating portfolios, spin rewards).

### Singleton Cache with TTL
`cache.ts` exports a single `Cache` instance (`export const cache = new Cache()`). The class wraps a `Map<string, CacheEntry<T>>` where each entry carries an `expiresAt` timestamp. On `get()`, expired entries are lazily evicted. A `prune()` method enables bulk cleanup. TTL constants are namespaced by data domain (`TTL.QUOTE`, `TTL.CANDLES`, `TTL.SEARCH`, `TTL.PROFILE`).

> **Serverless note**: Each Vercel serverless instance maintains its own cache — no cross-instance sharing.

### Shared State Extraction Pattern
`spin.ts` extracts discrete game state from multiple Supabase tables (`daily_spins`, `portfolios`, `powerups`) and composes a unified `SpinStatus` interface. Queries are scoped to `user_id` with ordering/limiting to fetch the most recent relevant records.

### Class Merging Utility
`utils.ts` exports `cn(...inputs: ClassValue[])` — a composition of `clsx` (conditional class names) and `tailwind-merge` (resolves Tailwind class conflicts). Standard shadcn/ui pattern for composable className props.

## Data & Control Flow

### Supabase Client Creation
```
Environment variables
  ├── NEXT_PUBLIC_SUPABASE_URL
  ├── NEXT_PUBLIC_SUPABASE_ANON_KEY    → browser client, server client
  └── SUPABASE_SERVICE_ROLE_KEY         → admin client (bypasses RLS)

Browser:  createClient() → createBrowserClient(url, anonKey) → SupabaseClient
Server:   await createClient() → cookies() → createServerClient(url, anonKey, { cookies: { getAll, setAll } }) → SupabaseClient
Admin:    createAdminClient() → createClient(url, serviceRoleKey) → SupabaseClient (RLS bypass)
```

### Cache Store/Retrieve
```
cache.set(key, value, ttlMs)
  → store.set(key, { value, expiresAt: Date.now() + ttlMs })

cache.get<T>(key): T | null
  → lookup entry in Map
  → if missing → return null
  → if Date.now() > expiresAt → delete entry, return null (lazy eviction)
  → return entry.value as T

cache.has(key) → cache.get(key) !== null
cache.delete(key) → store.delete(key)
cache.prune() → iterate Map, delete all entries where now > expiresAt
```

### Spin Status Computation
```
getSpinStatus(userId)
  1. Fetch last spin from daily_spins (most recent by created_at)
  2. Fetch portfolio.free_spins
  3. Compute todayReset (UTC 21:00) and nextReset
  4. canSpin = hasFreeSpins || noLastSpin || lastSpin.created_at < todayReset
  5. Fetch active powerup (x2_returns, unclaimed, expires_at > now)
  6. Fetch expired powerup (x2_returns, unclaimed, expires_at < now)
  7. Return SpinStatus { canSpin, nextResetAt, hasActivePowerup, activePowerupExpiresAt, hasExpiredPowerup, freeSpinsRemaining }
```

The reset hour is fixed at `RESET_HOUR_UTC = 21` (9 PM UTC). `getTodayReset()` computes today's reset boundary; `getNextReset()` returns today's or tomorrow's reset depending on whether the current time has passed it.

## Integration Points

### External Dependencies
| Package | Usage |
|---------|-------|
| `@supabase/ssr` | `createServerClient`, `createBrowserClient`, `CookieOptions` type |
| `@supabase/supabase-js` | Raw `createClient` for service-role admin access |
| `next/headers` | `cookies()` API for server-side cookie store access |
| `clsx` | Conditional class name composition in `cn()` |
| `tailwind-merge` | Tailwind class conflict resolution in `cn()` |

### Cookie Handling
The server client (`server.ts`) implements the `cookies` adapter required by `@supabase/ssr`:
- **`getAll()`** — reads all cookies from the Next.js cookie store, enabling session restoration on server requests.
- **`setAll()`** — writes Supabase auth cookies (access token, refresh token). Wrapped in a try/catch because Server Components cannot mutate cookies — the middleware (`src/middleware.ts`) handles session refresh instead.

### Service Role Authentication
`createAdminClient()` uses `SUPABASE_SERVICE_ROLE_KEY` which grants full database access, bypassing all RLS policies. This is required for:
- Auto-creating `users` and `portfolios` rows on signup (via DB trigger `handle_new_user()`)
- Spin reward operations that need cross-table writes
- Any admin-level data manipulation

> **Security**: The service role key must never be exposed to the browser. `admin.ts` is only imported in server components and route handlers.

### Database Tables Referenced
| Table | Accessed By |
|-------|-------------|
| `daily_spins` | `spin.ts` — last spin lookup |
| `portfolios` | `spin.ts` — free_spins count |
| `powerups` | `spin.ts` — active/expired powerup detection |
