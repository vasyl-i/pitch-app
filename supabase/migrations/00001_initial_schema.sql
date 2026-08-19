-- EarGym initial schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================================
-- 1. Profiles (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users read own profile"  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Vocal profiles
-- ============================================================
create table public.vocal_profiles (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  max_low_midi      int,
  max_high_midi     int,
  comfort_low_midi  int,
  comfort_high_midi int,
  confidence        real,
  detected_at       timestamptz,
  temp_adjustment   jsonb,
  auto_transpose    boolean default true,
  updated_at        timestamptz default now()
);

alter table public.vocal_profiles enable row level security;
create policy "Own vocal profile" on public.vocal_profiles for all using (auth.uid() = user_id);

-- ============================================================
-- 3. Learning preferences
-- ============================================================
create table public.learning_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  primary_goal         text,
  secondary_goal       text,
  daily_minutes        int default 10,
  experience           text default 'beginner',
  music_reading        text default 'none',
  preferred_genres     text[],
  coach_style          text default 'encouraging',
  preferred_difficulty text default 'adaptive',
  updated_at           timestamptz default now()
);

alter table public.learning_preferences enable row level security;
create policy "Own learning prefs" on public.learning_preferences for all using (auth.uid() = user_id);

-- ============================================================
-- 4. Skills (mastery + spaced repetition)
-- ============================================================
create table public.skills (
  user_id             uuid references public.profiles(id) on delete cascade,
  skill_id            text not null,
  mastery             real default 0,
  confidence          real default 0,
  trend               text default 'steady',
  practice_time_sec   int default 0,
  exercises_completed int default 0,
  fast_ewma           real default 0,
  slow_ewma           real default 0,
  review_interval_idx int,
  review_next_due_at  timestamptz,
  review_last_at      timestamptz,
  updated_at          timestamptz default now(),
  primary key (user_id, skill_id)
);

alter table public.skills enable row level security;
create policy "Own skills" on public.skills for all using (auth.uid() = user_id);

-- ============================================================
-- 5. Practice sessions
-- ============================================================
create table public.sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references public.profiles(id) on delete cascade,
  exercise_id    text not null,
  exercise_title text,
  score          int,
  stars          int,
  avg_cents      real,
  stability      real,
  rhythm         real,
  duration_sec   int,
  notes          jsonb,
  notes_by_midi  jsonb,
  intervals      jsonb,
  created_at     timestamptz default now()
);

alter table public.sessions enable row level security;
create policy "Own sessions" on public.sessions for all using (auth.uid() = user_id);

create index idx_sessions_user on public.sessions(user_id, created_at desc);

-- ============================================================
-- 6. Instrumental tracks (audio files in Storage)
-- ============================================================
create table public.instrumentals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  filename    text not null,
  storage_key text not null,
  key_data    jsonb,
  created_at  timestamptz default now()
);

alter table public.instrumentals enable row level security;
create policy "Own instrumentals" on public.instrumentals for all using (auth.uid() = user_id);

create index idx_instrumentals_user on public.instrumentals(user_id);

-- ============================================================
-- 7. Subscriptions
-- ============================================================
create table public.subscriptions (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  status             text default 'free',
  plan_id            text,
  current_period_end timestamptz,
  trial_ends_at      timestamptz,
  first_subscribed   timestamptz,
  will_renew         boolean default false,
  source             text default 'none'
);

alter table public.subscriptions enable row level security;
create policy "Own subscription" on public.subscriptions for all using (auth.uid() = user_id);

-- ============================================================
-- 8. Storage bucket for instrumentals
-- ============================================================
insert into storage.buckets (id, name, public)
values ('instrumentals', 'instrumentals', false);

create policy "Users upload own instrumentals"
  on storage.objects for insert
  with check (bucket_id = 'instrumentals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users read own instrumentals"
  on storage.objects for select
  using (bucket_id = 'instrumentals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own instrumentals"
  on storage.objects for delete
  using (bucket_id = 'instrumentals' and (storage.foldername(name))[1] = auth.uid()::text);
