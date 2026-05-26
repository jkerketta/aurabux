-- Add snapshot_value to powerups table to track investments value at activation
alter table public.powerups add column if not exists snapshot_value numeric default 0;
