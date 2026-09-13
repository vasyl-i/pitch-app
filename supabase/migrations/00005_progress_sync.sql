-- Add updated_at to daily_plans for sync conflict resolution
alter table public.daily_plans
  add column if not exists updated_at timestamptz not null default now();

-- Add skip_redo_warning to learning_preferences
alter table public.learning_preferences
  add column if not exists skip_redo_warning boolean default false;
