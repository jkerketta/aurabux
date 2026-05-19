## Repository Map

A full codemap is available at `codemap.md` in the project root.

Before working on any task, read `codemap.md` to understand:
- Project architecture and entry points
- Directory responsibilities and design patterns
- Data flow and integration points between modules

For deep work on a specific folder, also read that folder's `codemap.md`.

## Project

Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase.
Fake stock trading game: users get 1000 ABX starting balance, pick real stocks, compete with friends.
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

Copy `.env.local` from `.env.example` and fill in Supabase credentials.

## Architecture

### Routes
```
/          → auth check → /dashboard or /login
/login     → email/password + Google sign-in
/signup    → email/password + Google sign-up
/dashboard → protected: portfolio overview (ABX balance, total value)
```

### Auth flow
- `src/middleware.ts` — Supabase SSR cookie handling + route protection. Redirects unauthenticated `/dashboard` → `/login`, authenticated `/login`|`/signup` → `/dashboard`.
- Signup triggers DB function `handle_new_user()` that auto-creates `users` + `portfolios` rows (1000 ABX starting balance).

### Supabase clients
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server/client-agnostic factory

### Database
- `supabase/migrations/001_initial_schema.sql` — `users` + `portfolios` tables with RLS policies.
- RLS: users can only read/update their own data.

### Path alias
`@/*` → `./src/*` (tsconfig.json)

### UI components
- shadcn/ui primitives at `@/components/ui/`
- Layout components (Sidebar, Header) at `@/components/layout/`

### Styling
- Tailwind CSS v4 — uses `@tailwindcss/postcss` plugin (no `tailwind.config.js`).
- Global styles in `src/app/globals.css`.
- Dark theme by default.

## Conventions

- Server components by default; use `"use client"` only when needed (hooks, interactivity).
- Keep Supabase server calls in server components or route handlers; use `client.ts` only in client components.
- Follow existing shadcn/ui patterns for new components.