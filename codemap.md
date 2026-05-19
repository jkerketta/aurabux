# Repository Atlas: Aurabux (ABX)

## Project Responsibility
A Next.js 15 + TypeScript + Tailwind v4 fake stock trading game. Users sign up with email (or Google OAuth), receive 1000 ABX starting balance, and compete with friends by picking real stocks. Dark-themed, minimal UI with custom ABX currency symbol.

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
| Styling | Tailwind CSS v4 (dark theme) |
| Auth/DB | Supabase (email + Google OAuth) |
| Runtime | React 19 |

## Directory Map (Aggregated)
| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `src/app/` | Next.js App Router entry points. Handles auth flow (login/signup), protected dashboard, root redirection. Server/client component split. | [View Map](src/app/codemap.md) |
| `src/components/` | Dashboard shell UI — Sidebar (static nav) and Header (user info + logout). Server/client boundary pattern. | [View Map](src/components/codemap.md) |
| `src/lib/` | Supabase client factory layer. Environment-specific client creation (browser vs server) with cookie-based auth persistence. | [View Map](src/lib/codemap.md) |
| `src/middleware.ts` | Supabase SSR middleware. Refreshes sessions via cookies, protects `/dashboard`, redirects authenticated users from auth routes. | Inline (single file) |
| `supabase/` | Database migrations. Schema for users/portfolios tables, RLS policies, and auto-create trigger on auth.user insert. | [View SQL](supabase/migrations/001_initial_schema.sql) |

## Route Map
```
/              → auth check → /dashboard or /login
/login         → email/password + Google sign-in
/signup        → email/password + Google sign-up (auto-creates profile via trigger)
/dashboard     → protected: sidebar + header + portfolio overview (ABX balance, total value)
```

## Data Flow
1. User visits `/` → server checks auth → redirects
2. Signup → Supabase auth creates user → DB trigger auto-creates `users` + `portfolios` rows
3. Login → Supabase auth validates → middleware sets cookies → dashboard loads
4. Dashboard → server fetches portfolio balance + username → renders cards
