-- Add reminder columns to learning_preferences
alter table public.learning_preferences
  add column if not exists reminder_hour int,
  add column if not exists reminder_minute int default 0;
