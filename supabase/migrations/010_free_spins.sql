-- Add free_spins column to portfolios table
alter table public.portfolios add column free_spins integer default 0;
