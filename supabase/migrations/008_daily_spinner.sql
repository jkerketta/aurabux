-- ─── Daily spins table ───────────────────────────────────────────────

create table public.daily_spins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  reward_type text not null check (reward_type in ('abx', 'stock', 'powerup_x2')),
  reward_value text not null,  -- ABX amount as string, stock ticker, or 'x2'
  created_at timestamptz default now()
);

create index idx_daily_spins_user on public.daily_spins (user_id, created_at desc);

alter table public.daily_spins enable row level security;

create policy "Users can view own spins"
  on public.daily_spins for select
  using (auth.uid() = user_id);

-- No INSERT policy needed — service_role bypasses RLS entirely

-- ─── Active powerups table ──────────────────────────────────────────

create table public.powerups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('x2_returns')),
  activated_at timestamptz default now(),
  expires_at timestamptz not null,
  claimed boolean default false
);

create index idx_powerups_user_active on public.powerups (user_id, claimed, expires_at);

alter table public.powerups enable row level security;

create policy "Users can view own powerups"
  on public.powerups for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE policies needed — service_role bypasses RLS entirely

-- ─── Grant permissions ───────────────────────────────────────────────

grant all on public.daily_spins to authenticated;
grant all on public.powerups to authenticated;
