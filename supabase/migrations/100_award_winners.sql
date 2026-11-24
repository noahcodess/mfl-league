-- 100: every award winner the league is allowed to see, for the 🏆 tags on player cards: #1 of each award for finished
-- seasons, and for this season once its ceremony is over (2 minutes after the commissioner finishes the show).
create or replace function public.award_winners() returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('season', a.season, 'award', a.award, 'id', a.entries->0->>'id', 'name', a.entries->0->>'name', 'team', a.entries->0->>'team')
    order by a.season desc, a.award), '[]'::jsonb)
  from public.season_awards a
  left join public.award_ceremony c on c.season = a.season and c.in_test = a.in_test
  where a.in_test = public.in_sandbox() and jsonb_array_length(a.entries) > 0
    and (a.season < public.setting_int('current_season') or (c.finished_at is not null and now() >= c.finished_at + interval '2 minutes'))
$$;
revoke all on function public.award_winners() from public;
grant execute on function public.award_winners() to anon, authenticated;
