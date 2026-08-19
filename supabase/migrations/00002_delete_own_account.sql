-- Allow authenticated users to delete their own account.
-- All user data cascades from auth.users, so this single delete cleans everything.

create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Only the authenticated user can call this, and it only deletes their own row.
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
