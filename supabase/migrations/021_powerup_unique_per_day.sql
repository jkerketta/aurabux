-- Prevent duplicate powerup activation: one activation per user per type per day
-- Uses a plain date column + unique index + trigger (avoids IMMUTABLE function issues with timestamptz)

-- 1. Clean up any partially-created failing indexes
DROP INDEX IF EXISTS idx_powerups_one_per_day_per_type;

-- 2. Add activation_date column
ALTER TABLE public.powerups ADD COLUMN IF NOT EXISTS activation_date date;

-- 3. Backfill existing rows (use UTC to be consistent)
UPDATE public.powerups SET activation_date = DATE(activated_at AT TIME ZONE 'UTC') WHERE activation_date IS NULL;

-- 4. Make NOT NULL
ALTER TABLE public.powerups ALTER COLUMN activation_date SET NOT NULL;

-- 5. Create unique index on the plain date column
CREATE UNIQUE INDEX idx_powerups_one_per_day_per_type ON public.powerups (user_id, type, activation_date);

-- 6. Create trigger function to auto-populate activation_date from activated_at
CREATE OR REPLACE FUNCTION public.set_activation_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.activation_date := DATE(NEW.activated_at AT TIME ZONE 'UTC');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Attach trigger
DROP TRIGGER IF EXISTS trg_set_activation_date ON public.powerups;
CREATE TRIGGER trg_set_activation_date
BEFORE INSERT ON public.powerups
FOR EACH ROW
EXECUTE FUNCTION public.set_activation_date();
