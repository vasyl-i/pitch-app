-- Daily exercise plans per user (one per day, stores the generated lesson)
create table public.daily_plans (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day_key    text not null,
  plan_data  jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day_key)
);

alter table public.daily_plans enable row level security;

create policy "Users can manage own daily plans"
  on public.daily_plans for all
  using (auth.uid() = user_id);

-- Weekly skill mastery snapshots for long-term progress charts
create table public.skill_snapshots (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  week_key   text not null,
  mastery    jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

alter table public.skill_snapshots enable row level security;

create policy "Users can manage own skill snapshots"
  on public.skill_snapshots for all
  using (auth.uid() = user_id);

-- Add exercise customisation columns to learning_preferences
alter table public.learning_preferences
  add column if not exists exercise_balance real default 0.5,
  add column if not exists disabled_exercises text[] default '{}';
