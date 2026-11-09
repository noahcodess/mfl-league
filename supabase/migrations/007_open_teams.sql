-- Public list of teams with no coach account yet (for the "X teams open" homepage). Reveals team ids only, no account details.
create or replace function public.open_team_ids() returns setof text
language sql stable security definer set search_path = '' as $$
  select t.id from public.teams t
  where not exists (select 1 from public.profiles p where p.team_id = t.id and p.role = 'coach')
  order by t.id
$$;
revoke execute on function public.open_team_ids() from public;
grant execute on function public.open_team_ids() to anon, authenticated;
