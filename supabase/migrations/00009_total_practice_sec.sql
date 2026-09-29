-- Add total_practice_sec to profiles for all-time practice tracking.
-- This survives the 500-session rolling window in the local store.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_practice_sec int NOT NULL DEFAULT 0;
