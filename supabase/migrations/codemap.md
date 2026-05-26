# Database Migrations: Supabase Schema

## Responsibility

This directory contains ordered Supabase PostgreSQL migrations that define the complete database schema for the Aurabux (ABX) fake stock trading game. It manages:

- **Table creation** — users, portfolios, holdings, transactions, friendships, daily_spins, powerups
- **Row Level Security (RLS) policies** — per-table access control ensuring users can only read/modify their own data
- **Trigger functions** — automatic user/portfolio provisioning on auth signup, sequential display number assignment
- **Permission grants** — table-level access for `service_role` and `authenticated` roles
- **Constraint management** — check constraints on enum-like columns, foreign key relationships, unique constraints
- **Schema evolution** — incremental migrations for new features (social, spinner, powerups) and bug fixes

## Design Patterns

### Migration Ordering

Migrations are numbered sequentially (`001`–`015`) and must be applied in order. Each migration is idempotent where possible (`add column if not exists`, `drop constraint if exists`). Later migrations depend on earlier ones — for example, `008_daily_spinner.sql` creates tables that `009_grant_spinner_permissions.sql` grants access to.

### RLS Policy Pattern

Every application table follows a consistent RLS structure:

```sql
alter table public.<table> enable row level security;

-- SELECT: user owns the row
create policy "Users can view own <table>"
  on public.<table> for select
  using (auth.uid() = <user_id_column>);

-- INSERT: user is the owner
create policy "Users can insert own <table>"
  on public.<table> for insert
  with check (auth.uid() = <user_id_column>);

-- UPDATE: user owns the row
create policy "Users can update own <table>"
  on public.<table> for update
  using (auth.uid() = <user_id_column>);

-- DELETE: user owns the row (when applicable)
create policy "Users can delete own <table>"
  on public.<table> for delete
  using (auth.uid() = <user_id_column>);
```

**Exception**: `daily_spins` and `powerups` have SELECT-only policies — INSERT/UPDATE are handled exclusively by `service_role` (which bypasses RLS).

### Trigger Function Pattern

Trigger functions use `security definer set search_path = public` to run with elevated privileges in a controlled schema context:

- `handle_new_user()` — fires `after insert on auth.users`, creates `users` and `portfolios` rows
- `assign_display_number()` — fires `before insert on public.users`, assigns sequential `#NNN` display number

### Constraint Management

Check constraints enforce enum-like values on text columns:
- `transactions.type` → `('buy', 'sell', 'spin')` (evolved from `('buy', 'sell')` in `015`)
- `daily_spins.reward_type` → `('abx', 'stock', 'powerup_x2', 'free_spins')` (evolved in `012`)
- `friendships.status` → `('pending', 'accepted', 'declined')`
- `powerups.type` → `('x2_returns')`

Constraints are dropped and recreated when values need to be extended (`012`, `015`).

### Permission Grant Pattern

Two-tier permission model:
1. **`service_role`** — full CRUD on all tables, bypasses RLS entirely. Used by server-side admin operations (spin rewards, auto-create).
2. **`authenticated`** — full CRUD on all tables, but RLS policies still enforce row-level ownership. Used by client-facing queries.

Grants are split across migrations (`004`, `005`, `009`) to match table creation order.

## Tables & Relationships

### Core Tables

| Table | Purpose | Key Columns | FK References |
|-------|---------|-------------|---------------|
| `users` | User profiles linked to auth | `id` (PK, refs auth.users), `username`, `display_number` | `auth.users(id)` ON DELETE CASCADE |
| `portfolios` | Trading account state | `id` (PK), `user_id` (unique), `abx_balance`, `total_value`, `total_invested`, `free_spins` | `users(id)` ON DELETE CASCADE |
| `holdings` | Current stock positions | `id` (PK), `user_id`, `ticker`, `shares`, `avg_buy_price` | `users(id)` ON DELETE CASCADE |
| `transactions` | Immutable trade log | `id` (PK), `user_id`, `ticker`, `type`, `shares`, `price_per_share` | `users(id)` ON DELETE CASCADE |

### Social Tables

| Table | Purpose | Key Columns | FK References |
|-------|---------|-------------|---------------|
| `friendships` | Friend request/response tracking | `id` (PK), `requester_id`, `addressee_id`, `status` | `users(id)` ON DELETE CASCADE (both) |

### Gamification Tables

| Table | Purpose | Key Columns | FK References |
|-------|---------|-------------|---------------|
| `daily_spins` | Spin reward history | `id` (PK), `user_id`, `reward_type`, `reward_value` | `users(id)` ON DELETE CASCADE |
| `powerups` | Active multiplier effects | `id` (PK), `user_id`, `type`, `activated_at`, `expires_at`, `claimed`, `snapshot_value` | `users(id)` ON DELETE CASCADE |

### Sequences

| Sequence | Purpose |
|----------|---------|
| `user_display_number_seq` | Generates sequential account numbers (#000, #001, ...) |

### Data Flow: User Signup

```
auth.users INSERT
    ↓ (trigger: on_auth_user_created)
handle_new_user()
    ├── INSERT public.users (id, username from metadata or email)
    │       ↓ (trigger: on_user_created_assign_number)
    │   assign_display_number() → sets display_number via sequence
    └── INSERT public.portfolios (user_id, abx_balance=10000, total_value=10000, total_invested=0)
```

### Data Flow: Trading

```
Buy/Sell action
    ├── INSERT public.transactions (type='buy'|'sell', shares, price)
    ├── INSERT/UPDATE public.holdings (upsert by user_id+ticker unique constraint)
    └── UPDATE public.portfolios (abx_balance, total_value, total_invested)
```

### Data Flow: Daily Spin

```
Spin action (server-side via service_role)
    ├── INSERT public.daily_spins (reward_type, reward_value)
    ├── INSERT/UPDATE public.portfolios (balance adjustment, free_spins)
    └── Optionally INSERT public.powerups (x2_returns with expiry)
```

## Integration Points

### Auth Integration

- `users.id` directly references `auth.users.id` — no separate auth table, the Supabase auth system is the source of truth
- The `handle_new_user()` trigger on `auth.users` is the bridge between Supabase Auth and application schema
- `security definer` on trigger functions allows them to operate despite RLS

### Role Integration

- **`service_role`** — used by `createAdminClient()` in `src/lib/supabase/admin.ts`. Bypasses RLS for admin operations: spin reward processing, portfolio auto-creation fallback.
- **`authenticated`** — used by browser/server Supabase clients. All queries are filtered through RLS policies.
- Both roles receive explicit `grant` statements; PostgreSQL does not grant table access by default.

### RLS Enforcement

- RLS is enabled on all 7 application tables
- Policy evaluation uses `auth.uid()` for ownership checks
- `007_allow_user_lookup.sql` adds a role-based policy (`auth.role() = 'authenticated'`) that overrides ownership for `users` SELECT — enabling friend search/lookup across all profiles
- `service_role` bypasses RLS entirely (Supabase behavior), so no INSERT policies are needed on `daily_spins`/`powerups`

### Application Integration

- `src/lib/supabase/client.ts` — browser client (authenticated role, RLS enforced)
- `src/lib/supabase/server.ts` — server client (authenticated role via SSR cookies, RLS enforced)
- `src/lib/supabase/admin.ts` — service role client (bypasses RLS, used for spin rewards)
- `src/middleware.ts` — Supabase SSR session management, provides auth context for RLS

## Migration History

| # | File | Summary |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Core tables: `users`, `portfolios`. RLS policies. Auto-create trigger on auth signup. Starting balance: 10000 ABX |
| 002 | `002_holdings_and_transactions.sql` | Trading tables: `holdings` (current positions), `transactions` (immutable log). RLS + indexes |
| 004 | `004_grant_service_role_permissions.sql` | Grant CRUD to `service_role` on core tables + sequences |
| 005 | `005_grant_authenticated_permissions.sql` | Grant CRUD to `authenticated` role on core tables + sequences |
| 006 | `006_social.sql` | `friendships` table with RLS. `display_number` column + sequence + auto-assign trigger. Backfill for existing users |
| 007 | `007_allow_user_lookup.sql` | Override RLS on `users` SELECT — allow any authenticated user to look up any profile |
| 008 | `008_daily_spinner.sql` | Gamification: `daily_spins` + `powerups` tables. SELECT-only RLS (service_role handles writes) |
| 009 | `009_grant_spinner_permissions.sql` | Grant CRUD to `service_role` on spinner tables |
| 010 | `010_free_spins.sql` | Add `free_spins` column to `portfolios` |
| 011 | `011_powerup_snapshot.sql` | Add `snapshot_value` to `powerups` for tracking portfolio value at activation |
| 012 | `012_fix_spinner_constraint.sql` | Extend `daily_spins.reward_type` check constraint to include `'free_spins'` |
| 013 | `013_total_invested.sql` | Add `total_invested` column to `portfolios` (already present in 001, idempotent) |
| 014 | `014_starting_balance_10000.sql` | Update portfolio defaults to 10000 ABX. Recreate `handle_new_user()` trigger with correct values |
| 015 | `015_add_spin_transactions.sql` | Extend `transactions.type` check constraint to include `'spin'` |
