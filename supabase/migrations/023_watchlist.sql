create table public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  ticker text not null,
  created_at timestamptz default now(),
  unique (user_id, ticker)
);

create index idx_watchlist_user on public.watchlist (user_id);

alter table public.watchlist enable row level security;

create policy "Users can view own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "Users can add to own watchlist"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can delete from own watchlist"
  on public.watchlist for delete
  using (auth.uid() = user_id);

grant all on public.watchlist to authenticated;