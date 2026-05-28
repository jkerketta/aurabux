## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.

## Project

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase.
Fake stock trading game: users get **10000 ABX** starting balance, pick real stocks, compete with friends.
Dark-themed, minimal UI. shadcn/ui (new-york style, zinc base, lucide icons).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint (next lint) |

No test framework is configured yet.

## Environment

Required env vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FINNHUB_API_KEY`

Copy `.env.local` from `.env.example` and fill in Supabase credentials.

## Architecture

### Routes
```
/          → auth check → /dashboard or /login
/login     → email/password + Google sign-in
/signup    → email/password + Google sign-up
/dashboard → protected: portfolio overview (ABX balance, total value, daily spin)
/dashboard/leaderboard → global leaderboard with live prices
/dashboard/search      → stock search with debounced input
/dashboard/stock/[symbol] → stock detail with chart, buy/sell, position
```

### Auth flow
- `src/middleware.ts` — Supabase SSR cookie handling + route protection. Redirects unauthenticated `/dashboard` → `/login`, authenticated `/login`|`/signup` → `/dashboard`.
- Signup triggers DB function `handle_new_user()` that auto-creates `users` + `portfolios` rows (**10000 ABX** starting balance).

### Supabase clients
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server/client-agnostic factory
- `src/lib/supabase/admin.ts` — service role client (bypasses RLS)

### Database
- `supabase/migrations/001_initial_schema.sql` — `users` + `portfolios` tables with RLS policies.
- `supabase/migrations/002_holdings_and_transactions.sql` — `holdings` + `transactions` tables.
- `supabase/migrations/008_daily_spinner.sql` — `daily_spins` + `powerups` tables.
- `supabase/migrations/016_onboarding_flag.sql` — `has_seen_onboarding` boolean in `users` table.
- RLS: users can only read/update their own data.
- `transactions.type` check constraint: `('buy', 'sell', 'spin')`

### Path alias
`@/*` → `./src/*` (tsconfig.json)

### UI components
- shadcn/ui primitives at `@/components/ui/`
- Layout components (Navbar) at `@/components/layout/`
- Spinner components at `@/components/spinner/`
- Onboarding modal at `@/components/onboarding/onboarding-modal.tsx`
- Transaction history at `@/components/transactions/transaction-history.tsx`
- Skeleton components at `@/components/ui/skeleton.tsx` and `@/components/skeletons/`

### Styling
- Tailwind CSS v4 — uses `@tailwindcss/postcss` plugin (no `tailwind.config.js`).
- Global styles in `src/app/globals.css` (includes shimmer keyframes — linear timing, 2.5s duration).
- Dark theme by default.

## Conventions

- Server components by default; use `"use client"` only when needed (hooks, interactivity).
- Keep Supabase server calls in server components or route handlers; use `client.ts` only in client components.
- Follow existing shadcn/ui patterns for new components.
- Use `createAdminClient()` (service role) only for admin operations (portfolio auto-create, spin rewards).
- All-time return uses `total_invested` (running net ABX spent on stocks), not hardcoded baseline.
- Buy balance check rounds both values to 2 decimals to avoid floating-point drift.
