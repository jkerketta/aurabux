-- Add CHECK constraints to prevent impossible states at the database level
-- These guard against application bugs and race conditions

-- Portfolios: prevent negative values
ALTER TABLE public.portfolios
  ADD CONSTRAINT check_abx_balance_nonnegative CHECK (abx_balance >= 0),
  ADD CONSTRAINT check_total_value_nonnegative CHECK (total_value >= 0),
  ADD CONSTRAINT check_total_invested_nonnegative CHECK (total_invested >= 0),
  ADD CONSTRAINT check_free_spins_nonnegative CHECK (free_spins >= 0);

-- Holdings: prevent negative shares and prices
ALTER TABLE public.holdings
  ADD CONSTRAINT check_shares_nonnegative CHECK (shares >= 0),
  ADD CONSTRAINT check_avg_buy_price_nonnegative CHECK (avg_buy_price >= 0);
