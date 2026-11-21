-- TEST mode is one thing now: the sandbox (green banner). While it's on, bots run every team, coach moves are locked and the
-- test tools work; leaving it puts the humans back in charge. The old 'test_mode' setting only means what it did for the
-- desk: the site owner may use commissioner powers while it's on (temporary, for Noah's testing).
create or replace function public.owner_access() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (value)::boolean from public.league_settings where key = 'test_mode'), false)
$$;
revoke execute on function public.owner_access() from public, anon;
grant execute on function public.owner_access() to authenticated;

create or replace function public.test_mode() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (value)::boolean from public.league_settings where key = 'sandbox'), false)
$$;

create or replace function public.is_commissioner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.commish_unlocks u on u.user_id = p.user_id
    where p.user_id = auth.uid() and p.role = 'commissioner' and u.expires_at > now()
  ) or (public.owner_access() and public.is_site_owner())
$$;
