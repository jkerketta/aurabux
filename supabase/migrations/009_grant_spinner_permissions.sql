-- Grant table-level permissions to service_role for spinner tables
-- The service_role key bypasses RLS but still needs basic table grants

grant select, insert, update, delete on public.daily_spins to service_role;
grant select, insert, update, delete on public.powerups to service_role;
grant usage, select on all sequences in schema public to service_role;
