-- Prevent double-spin: one spin per user per day
-- Uses a plain date column + unique index + trigger (avoids IMMUTABLE function issues with timestamptz)

-- 1. Clean up any partially-created failing indexes
DROP INDEX IF EXISTS idx_daily_spins_one_per_day;

-- 2. Add spin_date column
ALTER TABLE public.daily_spins ADD COLUMN IF NOT EXISTS spin_date date;

-- 3. Backfill existing rows (use UTC to be consistent)
UPDATE public.daily_spins SET spin_date = DATE(created_at AT TIME ZONE 'UTC') WHERE spin_date IS NULL;

-- 4. Deduplicate: keep only the earliest spin per user per day
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, spin_date
    ORDER BY created_at ASC, id ASC
  ) as rn
  FROM public.daily_spins
)
DELETE FROM public.daily_spins
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 5. Make NOT NULL
ALTER TABLE public.daily_spins ALTER COLUMN spin_date SET NOT NULL;

-- 6. Create unique index on the plain date column
CREATE UNIQUE INDEX idx_daily_spins_one_per_day ON public.daily_spins (user_id, spin_date);

-- 7. Create trigger function to auto-populate spin_date from created_at
CREATE OR REPLACE FUNCTION public.set_spin_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.spin_date := DATE(NEW.created_at AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Attach trigger
DROP TRIGGER IF EXISTS trg_set_spin_date ON public.daily_spins;
CREATE TRIGGER trg_set_spin_date
BEFORE INSERT ON public.daily_spins
FOR EACH ROW
EXECUTE FUNCTION public.set_spin_date();
