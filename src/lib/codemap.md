# src/lib/

## Responsibility
Provides shared library utilities and infrastructure clients for the application. Currently houses the Supabase database client factory, offering environment-specific client creation for both browser (client-side) and server (server-side) contexts.

## Design
- **Factory pattern**: Exposes `createClient()` functions that instantiate configured Supabase clients rather than exporting singleton instances
- **Environment separation**: Two distinct client factories (`client.ts` for browser, `server.ts` for server) using `@supabase/ssr` package utilities
- **Cookie-based auth**: Server client implements cookie persistence via `getAll`/`setAll` handlers to maintain session state across server requests
- **Type-safe configuration**: Uses TypeScript types from `@supabase/ssr` (`CookieOptions`) for cookie operations

## Flow
- **Client-side**: `createBrowserClient()` is called with environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) to create a browser-compatible Supabase client
- **Server-side**: `createServerClient()` is called asynchronously, retrieving the Next.js cookie store via `next/headers`, then configuring cookie read/write handlers. The `setAll` catch block gracefully handles Server Component contexts where cookie setting is not possible (delegated to middleware)
- **Data flow**: Environment variables → factory function → configured Supabase client → consumer components/pages

## Integration
- **Dependencies**: `@supabase/ssr` (Supabase SSR utilities), `next/headers` (Next.js cookie API), environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Consumers**: Server components, client components, API routes, and middleware that need database/auth access via Supabase
- **Subdirectory**: `supabase/` contains the client factories (`client.ts`, `server.ts`)
