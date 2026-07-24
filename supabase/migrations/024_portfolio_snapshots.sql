create table public.portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  total_value numeric not null,
  snapshot_at date not null default current_date,
  unique (user_id, snapshot_at)
);

create index idx_portfolio_snapshots_user on public.portfolio_snapshots (user_id, snapshot_at desc);

alter table public.portfolio_snapshots enable row level security;

create policy "Users can view own snapshots"
  on public.portfolio_snapshots for select
  using (auth.uid() = user_id);

grant select on public.portfolio_snapshots to authenticated;