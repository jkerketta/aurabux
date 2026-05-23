-- Add total_invested column to track net ABX invested in stocks
alter table public.portfolios add column if not exists total_invested numeric default 0;
