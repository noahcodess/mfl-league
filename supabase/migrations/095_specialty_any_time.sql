-- 095: coaches can pick (or change) regular-season specialty games any time, not just in the preseason. A game that's been
-- played, has started, or whose week has already passed is locked. Still 2 per season, each alternate only once.
create or replace function public.pick_specialty_game(p_game bigint, p_slot int, p_fans boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); g public.games; used int; wk int := coalesce(public.setting_int('current_week'), 0);
begin
  if me is null then raise exception 'Only a team''s coach can pick specialty games'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null or g.home_team is distinct from me then raise exception 'Specialty uniforms are for your home games'; end if;
  if g.status = 'final' then raise exception 'That game was already played'; end if;
  if exists (select 1 from public.game_state s where s.game_id = p_game and s.status in ('live', 'final')) then raise exception 'That game already started'; end if;
  if g.kind = 'preseason' then raise exception 'Specialty games are regular season and playoff home games'; end if;
  if g.kind = 'regular' and g.season = public.setting_int('current_season')
     and (select value #>> '{}' from public.league_settings where key = 'phase') = 'regular_season' and g.week < wk then
    raise exception 'That week has passed'; end if;
  if p_slot is null then delete from public.game_uniforms where game_id = p_game and team_id = me; return jsonb_build_object('ok', true); end if;
  if p_slot not in (3, 4) then raise exception 'Pick one of your two alternate jerseys'; end if;
  if g.kind = 'regular' then
    select count(*) into used from public.game_uniforms u join public.games x on x.id = u.game_id
      where u.team_id = me and x.season = g.season and x.kind = 'regular' and u.game_id <> p_game;
    if used >= 2 then raise exception 'You already picked your 2 specialty games. Take one back first.'; end if;
    if exists (select 1 from public.game_uniforms u join public.games x on x.id = u.game_id
               where u.team_id = me and x.season = g.season and x.kind = 'regular' and u.game_id <> p_game and u.slot = p_slot) then
      raise exception 'You already wear that alternate in another specialty game. Each one can only be used once.'; end if;
  end if;
  insert into public.game_uniforms (game_id, team_id, slot, fans_match) values (p_game, me, p_slot, coalesce(p_fans, false))
  on conflict (game_id, team_id) do update set slot = excluded.slot, fans_match = excluded.fans_match, picked_at = now();
  return jsonb_build_object('ok', true);
end $$;
