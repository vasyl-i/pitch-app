-- Add weekly_plan JSONB column to learning_preferences
-- Stores the user's custom weekly exercise plan as a JSON object
-- keyed by weekday index (0=Mon … 6=Sun), each value an array of
-- {activityId, kind, difficultyId?} entries.
ALTER TABLE learning_preferences
  ADD COLUMN IF NOT EXISTS weekly_plan JSONB DEFAULT NULL;
