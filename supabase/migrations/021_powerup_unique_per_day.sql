-- Prevent duplicate powerup activation: one activation per user per type per day

-- 1. Clean up everything from previous attempts
DROP INDEX IF EXISTS idx_powerups_one_per_day_per_type;
DROP TRIGGER IF EXISTS trg_set_activation_date ON public.powerups;
DROP FUNCTION IF EXISTS public.set_activation_date();
ALTER TABLE public.powerups DROP COLUMN IF EXISTS activation_date CASCADE;

-- 2. Add activation_date column (fresh, plain date)
ALTER TABLE public.powerups ADD COLUMN activation_date date;

-- 3. Backfill existing rows
UPDATE public.powerups SET activation_date = DATE(activated_at AT TIME ZONE 'UTC') WHERE activation_date IS NULL;

-- 4. Deduplicate: keep only the earliest activation per user per type per day
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, type, activation_date
    ORDER BY activated_at ASC, id ASC
  ) as rn
  FROM public.powerups
)
DELETE FROM public.powerups
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 5. Make NOT NULL
ALTER TABLE public.powerups ALTER COLUMN activation_date SET NOT NULL;

-- 6. Create unique index
CREATE UNIQUE INDEX idx_powerups_one_per_day_per_type ON public.powerups (user_id, type, activation_date);

-- 7. Trigger function
CREATE OR REPLACE FUNCTION public.set_activation_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.activation_date := DATE(NEW.activated_at AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Attach trigger
CREATE TRIGGER trg_set_activation_date
BEFORE INSERT ON public.powerups
FOR EACH ROW
EXECUTE FUNCTION public.set_activation_date();