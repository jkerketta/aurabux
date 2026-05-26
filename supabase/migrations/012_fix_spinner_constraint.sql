-- Fix daily_spins check constraint to include 'free_spins' reward type
alter table public.daily_spins drop constraint if exists daily_spins_reward_type_check;

alter table public.daily_spins add constraint daily_spins_reward_type_check
  check (reward_type in ('abx', 'stock', 'powerup_x2', 'free_spins'));
