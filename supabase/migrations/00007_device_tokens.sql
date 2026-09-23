-- Device push tokens for FCM / APNs
create table public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text not null,  -- 'ios' | 'android'
  updated_at timestamptz default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;
create policy "Own device tokens" on public.device_tokens for all using (auth.uid() = user_id);
