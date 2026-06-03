-- Remove client-side write access to holdings and transactions
-- All writes must go through API routes using service_role (admin client)
-- Users can still SELECT their own data (needed for UI)

-- Drop client-side write policies on holdings
DROP POLICY IF EXISTS "Users can insert own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON public.holdings;

-- Drop client-side write policy on transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
