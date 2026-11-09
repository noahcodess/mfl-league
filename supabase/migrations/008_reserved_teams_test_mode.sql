-- Reserved teams can't be claimed. Test mode lets the site owner act as commissioner without the key (one switch, off later).
alter table public.teams add column reserved boolean not null default false;
update public.teams set reserved = true where id in ('lsc', 'tga', 'flf', 'crf', 'void', 'edc', 'dst');
insert into public.league_settings (key, value) values ('test_mode', 'true') on conflict (key) do update set value = 'true';

create or replace function public.test_mode() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value)::boolean from public.league_settings where key = 'test_mode'), false)
$$;

-- Commissioner powers: the commissioner with his key entered, or the site owner while test mode is on.
create or replace function public.is_commissioner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.commish_unlocks u on u.user_id = p.user_id
    where p.user_id = auth.uid() and p.role = 'commissioner' and u.expires_at > now()
  ) or (public.test_mode() and public.is_site_owner())
$$;

create or replace function public.open_team_ids() returns setof text
language sql stable security definer set search_path = '' as $$
  select t.id from public.teams t
  where not t.reserved and not exists (select 1 from public.profiles p where p.team_id = t.id and p.role = 'coach')
  order by t.id
$$;
revoke execute on function public.test_mode() from public;
grant execute on function public.test_mode() to anon, authenticated;

-- To turn test mode off: update public.league_settings set value = 'false' where key = 'test_mode';
