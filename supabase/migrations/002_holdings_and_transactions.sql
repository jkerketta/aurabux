-- Holdings: what stocks a user currently owns
create table public.holdings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  ticker text not null,
  shares numeric not null default 0,
  avg_buy_price numeric not null default 0,
  created_at timestamptz default now(),
  unique (user_id, ticker)
);

-- Transactions: permanent record of every buy/sell
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  ticker text not null,
  type text not null check (type in ('buy', 'sell')),
  shares numeric not null,
  price_per_share numeric not null,
  created_at timestamptz default now()
);

-- Indexes for fast user-scoped queries
create index idx_holdings_user_id on public.holdings (user_id);
create index idx_transactions_user_id on public.transactions (user_id);

-- Enable RLS
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;

-- Holdings policies
create policy "Users can view own holdings"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "Users can insert own holdings"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on public.holdings for update
  using (auth.uid() = user_id);

create policy "Users can delete own holdings"
  on public.holdings for delete
  using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);
