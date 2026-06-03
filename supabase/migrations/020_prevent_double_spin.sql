-- Prevent double-spin: one spin per user per day
-- The unique index on (user_id, day) makes the second INSERT fail at DB level

CREATE UNIQUE INDEX idx_daily_spins_one_per_day
  ON public.daily_spins (user_id, date(created_at::timestamp));
