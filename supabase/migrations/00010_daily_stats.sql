-- Daily practice history behind the Progress tab: one row per user per local
-- calendar day. Sessions are capped on the device, so all-time numbers
-- (days practiced, perfect notes, practice time) and their charts come from
-- these rows instead.
--
-- Two client stores write disjoint columns of the same row (practice
-- counters from the progress store, closing mastery from the learning
-- store), each with a partial upsert, so neither overwrites the other.
create table public.daily_stats (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  -- the user's local day, not UTC: a session at 23:30 counts for that evening
  day           date not null,
  sessions      int not null default 0,
  practice_sec  int not null default 0,
  perfect_notes int not null default 0,
  graded_notes  int not null default 0,
  -- skill id → mastery 0–100 at the close of the day, trained skills only
  mastery       jsonb,
  updated_at    timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_stats enable row level security;

create policy "Own daily stats"
  on public.daily_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
