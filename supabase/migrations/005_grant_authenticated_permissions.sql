-- Grant table-level permissions to authenticated role (logged-in users)
-- RLS policies still protect individual rows; this just allows the role to query the tables

grant select, insert, update, delete on public.portfolios to authenticated;
grant select, insert, update, delete on public.holdings to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.users to authenticated;

-- Grant sequence usage (for auto-incrementing IDs)
grant usage, select on all sequences in schema public to authenticated;
