-- Returns true if a confirmed user with this email exists in auth.users.
-- Callable by anon so the sign-up flow can route to sign-in vs create-account.
create or replace function public.email_exists(lookup_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where email = lower(lookup_email)
  );
$$;

grant execute on function public.email_exists(text) to anon, authenticated;
