-- Allow 'spin' type in transactions table
alter table public.transactions
  drop constraint transactions_type_check,
  add constraint transactions_type_check check (type in ('buy', 'sell', 'spin'));
