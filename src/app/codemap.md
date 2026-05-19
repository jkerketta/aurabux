# src/app/

## Responsibility
Defines the Next.js App Router entry points and page-level routing for the Aurabux fake stock trading game. Handles authentication flow (login/signup), protected dashboard access, and root-level redirection logic.

## Design
- **Next.js App Router** with nested layouts for route grouping
- **Server components** by default for data fetching (dashboard, root page)
- **Client components** (`"use client"`) for interactive auth forms (login, signup)
- **Supabase** as the auth and data layer via `@/lib/supabase/server` (server) and `@/lib/supabase/client` (client)
- **Dark theme** with custom CSS variables in `globals.css` (background, surface, primary, success, danger, text colors)
- **Tailwind CSS** for utility-first styling
- **Protected routes**: dashboard layout guards against unauthenticated access via server-side `getUser()` check
- **Shared layout pattern**: `login/` and `signup/` use identical `AuthLayout` wrappers with `force-dynamic` rendering

## Flow

### Entry (`/`)
1. `page.tsx` (server) creates Supabase client and checks `getUser()`
2. If authenticated → redirect to `/dashboard`
3. If not → redirect to `/login`

### Authentication (`/login`, `/signup`)
1. Client-side pages render centered auth forms
2. Email/password flow: calls `supabase.auth.signInWithPassword()` (login) or `supabase.auth.signUp()` (signup)
3. OAuth flow: calls `supabase.auth.signInWithOAuth({ provider: "google" })` with redirect to `/dashboard`
4. On success → `router.push("/dashboard")` + `router.refresh()` to invalidate server caches
5. Errors displayed inline in styled alert boxes

### Dashboard (`/dashboard`)
1. `layout.tsx` (server) verifies authentication; redirects to `/login` if unauthenticated
2. Renders `Sidebar` + `Header` shell with `{children}` in main content area
3. `page.tsx` (server) fetches:
   - `portfolios` table: `abx_balance`, `total_value` for current user
   - `users` table: `username` for current user
4. Displays balance cards with formatted currency and fallback defaults (1,000.00 ABX)

## Integration

### Internal dependencies
| Module | Consumed by | Purpose |
|---|---|---|
| `@/lib/supabase/server` | `app/page.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/page.tsx` | Server-side Supabase client for auth checks and data queries |
| `@/lib/supabase/client` | `app/login/page.tsx`, `app/signup/page.tsx` | Client-side Supabase client for auth mutations |
| `@/components/layout/sidebar` | `app/dashboard/layout.tsx` | Navigation sidebar component |
| `@/components/layout/header` | `app/dashboard/layout.tsx` | Top header bar with user info |
| `app/globals.css` | `app/layout.tsx` | Global styles, Tailwind import, theme variables |

### External dependencies
- **Next.js** (App Router, `next/font/google` for Inter, `next/navigation` for redirect/router)
- **Supabase** (auth: email/password + Google OAuth; database: portfolios, users tables)
- **Tailwind CSS** (via `@import "tailwindcss"`)

### Route map
```
/              → redirect (auth check) → /dashboard or /login
/login         → client auth form (email + Google)
/signup        → client signup form (email + Google)
/dashboard     → protected layout + portfolio overview
```
