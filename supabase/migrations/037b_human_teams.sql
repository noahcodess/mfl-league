-- Which teams have a coach (everyone else is run by the computer). Public: it's shown in the draft room.
create or replace function public.coached_teams() returns setof text
language sql stable security definer set search_path = '' as $$
  select distinct team_id from public.profiles where role = 'coach' and team_id is not null
$$;
revoke execute on function public.coached_teams() from public;
grant execute on function public.coached_teams() to anon, authenticated;
