-- Migration: add has_seen_onboarding flag to users table
-- This controls whether the onboarding modal is shown to new users

ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT FALSE;

-- Update existing users to have seen onboarding (so they don't see it again)
UPDATE users
SET has_seen_onboarding = TRUE
WHERE has_seen_onboarding = FALSE;
