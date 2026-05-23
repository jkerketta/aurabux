-- Update starting balance from 1000 to 10000
-- This catches the case where 001_initial_schema.sql was already applied
-- with the old 1000 defaults.

-- Update column defaults for safety
alter table public.portfolios alter column abx_balance set default 10000;
alter table public.portfolios alter column total_value set default 10000;

-- Update the auto-create trigger for new signups
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
  insert into public.portfolios (user_id, abx_balance, total_value, total_invested)
  values (new.id, 10000, 10000, 0);
  return new;
end;
$$;
