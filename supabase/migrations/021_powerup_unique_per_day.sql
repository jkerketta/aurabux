-- Prevent duplicate powerup activation: one activation per user per type per day

CREATE UNIQUE INDEX idx_powerups_one_per_day_per_type
  ON public.powerups (user_id, type, date(activated_at::timestamp));
