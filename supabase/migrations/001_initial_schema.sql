-- Create users table
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  username text not null unique,
  created_at timestamptz default now()
);

-- Create portfolios table
create table public.portfolios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  abx_balance numeric not null default 1000,
  total_value numeric not null default 1000,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.portfolios enable row level security;

-- Users can read their own data
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Users can read their own portfolio
create policy "Users can view own portfolio"
  on public.portfolios for select
  using (auth.uid() = user_id);

-- Users can update their own portfolio
create policy "Users can update own portfolio"
  on public.portfolios for update
  using (auth.uid() = user_id);

-- Auto-create user profile and portfolio on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  insert into public.portfolios (user_id, abx_balance, total_value)
  values (new.id, 1000, 1000);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
