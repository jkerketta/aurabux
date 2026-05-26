-- Grant table-level permissions to service_role
-- The service_role key bypasses RLS but still needs basic table grants

grant select, insert, update, delete on public.portfolios to service_role;
grant select, insert, update, delete on public.holdings to service_role;
grant select, insert, update, delete on public.transactions to service_role;
grant select, insert, update, delete on public.users to service_role;

-- Also grant usage on sequences (for auto-incrementing IDs)
grant usage, select on all sequences in schema public to service_role;
