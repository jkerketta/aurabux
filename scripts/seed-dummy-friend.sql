-- ============================================================
-- Dummy friend setup: aura#000
-- Run this in Supabase SQL Editor after Step 1 below.
-- ============================================================

-- STEP 1: Create the auth user in Supabase Dashboard first:
--   Authentication → Users → Add User
--   Email: dummy@aurabux.test
--   Password: test1234
--   This triggers handle_new_user() which auto-creates
--   public.users + public.portfolios rows.
--
-- STEP 2: Copy YOUR user ID from: Authentication → Users →
--   find your email → copy the UUID
--   Replace '<YOUR-USER-ID>' below with that UUID.
--
-- STEP 3: Run this entire script.

DO $$
DECLARE
  v_my_user_id uuid := '<YOUR-USER-ID>';
  v_dummy_id uuid;
BEGIN
  -- Find the dummy user (created by the auth trigger)
  SELECT id INTO v_dummy_id
  FROM public.users
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'dummy@aurabux.test'
  );

  IF v_dummy_id IS NULL THEN
    RAISE EXCEPTION 'Dummy user not found. Did you create the auth user in Step 1?';
  END IF;

  -- Update dummy user profile
  UPDATE public.users
  SET username = 'aura', display_number = '#000'
  WHERE id = v_dummy_id;

  -- Set portfolio (5000 ABX cash, 5000 invested)
  UPDATE public.portfolios
  SET abx_balance = 5000, total_invested = 5000
  WHERE user_id = v_dummy_id;

  -- Buy AAPL: 10 shares @ $175.50
  INSERT INTO public.holdings (user_id, ticker, shares, avg_buy_price)
  VALUES (v_dummy_id, 'AAPL', 10, 175.50)
  ON CONFLICT (user_id, ticker) DO UPDATE
  SET shares = public.holdings.shares + 10,
      avg_buy_price = (public.holdings.avg_buy_price * public.holdings.shares + 10 * 175.50) / (public.holdings.shares + 10);
  INSERT INTO public.transactions (user_id, ticker, type, shares, price_per_share)
  VALUES (v_dummy_id, 'AAPL', 'buy', 10, 175.50);

  -- Buy NVDA: 5 shares @ $850.00
  INSERT INTO public.holdings (user_id, ticker, shares, avg_buy_price)
  VALUES (v_dummy_id, 'NVDA', 5, 850.00)
  ON CONFLICT (user_id, ticker) DO UPDATE
  SET shares = public.holdings.shares + 5,
      avg_buy_price = (public.holdings.avg_buy_price * public.holdings.shares + 5 * 850.00) / (public.holdings.shares + 5);
  INSERT INTO public.transactions (user_id, ticker, type, shares, price_per_share)
  VALUES (v_dummy_id, 'NVDA', 'buy', 5, 850.00);

  -- Buy TSLA: 20 shares @ $210.00
  INSERT INTO public.holdings (user_id, ticker, shares, avg_buy_price)
  VALUES (v_dummy_id, 'TSLA', 20, 210.00)
  ON CONFLICT (user_id, ticker) DO UPDATE
  SET shares = public.holdings.shares + 20,
      avg_buy_price = (public.holdings.avg_buy_price * public.holdings.shares + 20 * 210.00) / (public.holdings.shares + 20);
  INSERT INTO public.transactions (user_id, ticker, type, shares, price_per_share)
  VALUES (v_dummy_id, 'TSLA', 'buy', 20, 210.00);

  -- Create accepted friendship (you ↔ aura)
  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (v_my_user_id, v_dummy_id, 'accepted')
  ON CONFLICT (requester_id, addressee_id) DO UPDATE
  SET status = 'accepted';

  RAISE NOTICE 'Dummy friend aura#000 created successfully!';
  RAISE NOTICE 'Check friends modal in the app → click chevron to view their portfolio.';
END $$;
