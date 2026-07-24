create table public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  achievement_key text not null,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_key)
);

create index idx_user_achievements_user on public.user_achievements (user_id);

alter table public.user_achievements enable row level security;

create policy "Users can view own achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

grant select on public.user_achievements to authenticated;