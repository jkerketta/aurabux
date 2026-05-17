# src/components/

## Responsibility
Provides the authenticated dashboard shell UI — the persistent layout wrapper (sidebar navigation + top header bar) used across all `/dashboard/*` routes.

## Design
- **Component split**: Two presentational components — `Sidebar` (static navigation) and `Header` (user info + actions).
- **Server/client boundary**: `Sidebar` is a server component (no `"use client"`), rendered statically. `Header` is a client component (`"use client"`) because it handles interactive logout via Supabase client SDK and Next.js router.
- **Styling**: Tailwind CSS with custom design tokens (`bg-surface`, `bg-background`, `text-primary`, `text-text-secondary`, `border-white/5`).
- **Prop surface**: `Sidebar` takes no props (nav items are hardcoded). `Header` accepts `{ user: User }` from Supabase auth.
- **Layout composition**: Composed in `app/dashboard/layout.tsx` as a flex shell: `<Sidebar />` on the left, `<Header />` + `<main>` stacked on the right.

## Flow
1. **Entry**: `app/dashboard/layout.tsx` (server component) creates a Supabase server client, fetches the authenticated user, and redirects to `/login` if unauthenticated.
2. **Render**: Passes the `user` object to `<Header user={user}>`; renders `<Sidebar />` without props.
3. **Interaction**: On "Sign Out" click, `Header` calls `supabase.auth.signOut()` via the browser Supabase client, then navigates to `/login` with `router.push()` + `router.refresh()`.
4. **Navigation**: `Sidebar` uses `next/link` for client-side navigation to `/dashboard`, `/dashboard/search`, `/dashboard/leaderboard`, `/dashboard/spinner`.

## Integration
| Dependency | Used by | Purpose |
|---|---|---|
| `@/lib/supabase/client` | `header.tsx` | Browser Supabase client for sign-out |
| `@/lib/supabase/server` | Consumer (`dashboard/layout.tsx`) | Server-side auth check before render |
| `@supabase/supabase-js` | `header.tsx` | `User` type for props |
| `next/navigation` | `header.tsx` | `useRouter` for post-logout redirect |
| `next/link` | `sidebar.tsx` | Client-side navigation links |
| `app/dashboard/layout.tsx` | Both | Direct consumer — composes shell layout |
