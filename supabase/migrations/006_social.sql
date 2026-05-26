-- ─── Friendships table ───────────────────────────────────────────────

create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.users(id) on delete cascade not null,
  addressee_id uuid references public.users(id) on delete cascade not null,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

create index idx_friendships_requester on public.friendships (requester_id);
create index idx_friendships_addressee on public.friendships (addressee_id);

-- Enable RLS
alter table public.friendships enable row level security;

-- RLS policies
create policy "Users can view friendships they are part of"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Addressee can update friendship status"
  on public.friendships for update
  using (auth.uid() = addressee_id);

create policy "Users can delete friendships they are part of"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ─── Display number (sequential account number) ──────────────────────

-- Add display_number column to users
alter table public.users add column display_number text;

-- Create a sequence for display numbers
create sequence public.user_display_number_seq start with 0 minvalue 0;

-- Function to assign display number on new user
create or replace function public.assign_display_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_num integer;
begin
  next_num := nextval('public.user_display_number_seq');
  new.display_number := '#' || lpad(next_num::text, 3, '0');
  return new;
end;
$$;

-- Trigger on new user insert
create trigger on_user_created_assign_number
  before insert on public.users
  for each row execute function public.assign_display_number();

-- Backfill existing users (ordered by created_at, first gets #000)
do $$
declare
  u record;
  counter integer := 0;
begin
  for u in select id from public.users order by created_at asc loop
    update public.users
    set display_number = '#' || lpad(counter::text, 3, '0')
    where id = u.id;
    counter := counter + 1;
  end loop;
  -- Reset sequence to continue from where we left off
  perform setval('public.user_display_number_seq', counter);
end $$;

-- ─── Grant permissions ───────────────────────────────────────────────

grant all on public.friendships to authenticated;
grant usage, select on sequence public.user_display_number_seq to authenticated;
