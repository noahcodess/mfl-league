-- 103: the playoffs. After the award ceremony (Week 13) the commissioner moves on round by round, all one game each:
-- Week 14 Quarterfinals (top 4 in each conference: 1 hosts 4, 2 hosts 3), Week 15 Semifinals (the conference titles, the
-- better seed hosts), Week 16 the Craft Bowl (the two conference champions). Nothing comes after the Craft Bowl yet.
-- The seeds come from the standings the site shows (its tiebreakers), checked here; they're kept in league_settings so the
-- next rounds know who's the better seed. Playoff games never touch regular-season records. advance_week stops at Week 13.

-- A team's seed (1-4) in its conference, from the saved seeds; 9 if he isn't seeded.
create or replace function public.playoff_seed(p_seeds jsonb, p_team text) returns int language sql immutable set search_path to '' as $function$
  select coalesce((select x.i::int from jsonb_each(p_seeds) c(conf, ids), jsonb_array_elements_text(c.ids) with ordinality x(id, i) where x.id = p_team limit 1), 9)
$function$;

-- The winners of one round's games in one conference (or the whole league with p_conf null).
create or replace function public.playoff_winners(p_season int, p_week int, p_conf text) returns text[] language sql stable set search_path to '' as $function$
  select coalesce(array_agg(case when g.home_score > g.away_score then g.home_team else g.away_team end order by g.id), '{}')
  from public.games g join public.teams t on t.id = g.home_team
  where g.season = p_season and g.week = p_week and g.kind in ('quarterfinal', 'semifinal') and g.status = 'final' and (p_conf is null or t.conference = p_conf)
$function$;

create or replace function public.advance_playoffs(p_seeds jsonb default null) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_season int := public.setting_int('current_season'); v_wk int := coalesce(public.setting_int('current_week'), 1);
  seeds jsonb; c text; w text[]; a text; b text; n int := 0; label text; next_wk int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'regular_season' then raise exception 'The playoffs come after the regular season'; end if;
  if v_wk < 13 then raise exception 'Finish the regular season and the award ceremony first'; end if;
  if v_wk >= 16 then raise exception 'The Craft Bowl is the last game of the season for now'; end if;
  next_wk := v_wk + 1;

  if v_wk = 13 then
    -- p_seeds: { "Overworld": [id, id, id, id], "Nether": [...] }, the 1 seed first.
    if p_seeds is null then raise exception 'The playoff seeds are missing'; end if;
    if exists (select 1 from public.games g where g.season = v_season and g.kind = 'regular' and g.status <> 'final') then
      raise exception 'Every regular-season game has to be final first'; end if;
    if exists (select 1 from public.games g where g.season = v_season and g.kind in ('quarterfinal', 'semifinal', 'craft_bowl')) then
      raise exception 'The playoffs already started'; end if;
    for c in select distinct conference from public.teams where conference is not null loop
      if jsonb_array_length(coalesce(p_seeds->c, '[]')) <> 4 then raise exception 'The % needs exactly 4 seeds', c; end if;
      if exists (select 1 from jsonb_array_elements_text(p_seeds->c) x(id) left join public.teams t on t.id = x.id where t.id is null or t.conference <> c) then
        raise exception 'A % seed is not a % team', c, c; end if;
      if (select count(distinct x.id) from jsonb_array_elements_text(p_seeds->c) x(id)) <> 4 then raise exception 'A % team is seeded twice', c; end if;
      if exists (select 1 from public.team_seasons o join public.teams t on t.id = o.team_id   -- nobody left out has more wins than a team that's in
                 where o.season = v_season and t.conference = c and not (p_seeds->c ? o.team_id)
                   and o.wins > (select min(i.wins) from public.team_seasons i where i.season = v_season and p_seeds->c ? i.team_id)) then
        raise exception 'The % seeds don''t match the standings', c; end if;
    end loop;
    update public.league_settings set value = jsonb_build_object('season', v_season, 'seeds', p_seeds) where key = 'playoff_seeds';
    if not found then insert into public.league_settings (key, value) values ('playoff_seeds', jsonb_build_object('season', v_season, 'seeds', p_seeds)); end if;
    for c in select distinct conference from public.teams where conference is not null loop
      insert into public.games (season, week, home_team, away_team, kind, conference_game) values
        (v_season, 14, p_seeds->c->>0, p_seeds->c->>3, 'quarterfinal', true), (v_season, 14, p_seeds->c->>1, p_seeds->c->>2, 'quarterfinal', true);
      n := n + 2;
    end loop;
    label := 'The Quarterfinals';
  else
    seeds := (select value->'seeds' from public.league_settings where key = 'playoff_seeds' and (value->>'season')::int = v_season);
    if seeds is null then raise exception 'The playoff seeds are missing'; end if;
    if exists (select 1 from public.games g where g.season = v_season and g.week = v_wk and g.kind in ('quarterfinal', 'semifinal') and g.status <> 'final') then
      raise exception 'Every game this round has to be final first'; end if;
    if exists (select 1 from public.games g where g.season = v_season and g.week = next_wk) then raise exception 'The next round is already set'; end if;
    if v_wk = 14 then
      for c in select distinct conference from public.teams where conference is not null loop
        w := public.playoff_winners(v_season, 14, c);
        if array_length(w, 1) is distinct from 2 then raise exception 'The % quarterfinals aren''t done', c; end if;
        if public.playoff_seed(seeds, w[1]) < public.playoff_seed(seeds, w[2]) then a := w[1]; b := w[2]; else a := w[2]; b := w[1]; end if;
        insert into public.games (season, week, home_team, away_team, kind, conference_game) values (v_season, 15, a, b, 'semifinal', true);
        n := n + 1;
      end loop;
      label := 'The Semifinals';
    else
      w := public.playoff_winners(v_season, 15, null);
      if array_length(w, 1) is distinct from 2 then raise exception 'The semifinals aren''t done'; end if;
      select x.id into a from unnest(w) x(id) left join public.team_seasons s on s.team_id = x.id and s.season = v_season   -- better seed, then record, then a coin flip
        order by public.playoff_seed(seeds, x.id), s.wins desc nulls last, (s.points_for - s.points_against) desc nulls last, random() limit 1;
      b := case when w[1] = a then w[2] else w[1] end;
      insert into public.games (season, week, home_team, away_team, kind, conference_game) values (v_season, 16, a, b, 'craft_bowl', false);
      n := 1;
      label := 'The Craft Bowl';
    end if;
  end if;

  update public.league_settings set value = to_jsonb(next_wk) where key = 'current_week';
  update public.league_settings set value = to_jsonb(coalesce(public.setting_int('league_clock'), 0) + 1) where key = 'league_clock';
  perform public.refresh_morale(true);
  perform public.bot_set_depth_all();
  perform public.log_event('week', null, null, format('%s %s set', label, case when n = 1 then 'is' else 'are' end), jsonb_build_object('week', next_wk, 'playoffs', true, 'games', n));
  perform public.notify(null, false, true, 'week', format('%s %s set', label, case when n = 1 then 'is' else 'are' end), 'See the matchups on the Live tab.', jsonb_build_object('week', next_wk));
  return jsonb_build_object('week', next_wk, 'round', label, 'games', n);
end $function$;

-- advance_week is for the regular season (and into the award ceremony); the playoffs move with advance_playoffs.
create or replace function public.advance_week() returns jsonb language plpgsql security definer set search_path to '' as $function$
declare wk int; bots jsonb; mor jsonb; cut int; depth int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'regular_season' then
    raise exception 'Game weeks start when the regular season begins'; end if;
  if coalesce(public.setting_int('current_week'), 1) >= 13 then raise exception 'The regular season is over: the playoffs move round by round'; end if;
  if coalesce(public.setting_int('current_week'), 1) >= 12 and not exists (select 1 from public.award_ceremony where season = public.setting_int('current_season')
      and in_test = public.in_sandbox() and locked_at is not null) then
    raise exception 'Confirm the award finalists first (Commissioner''s Desk → Awards)'; end if;
  bots := public.bot_weekly();
  wk := coalesce(public.setting_int('current_week'), 1) + 1;
  update public.league_settings set value = to_jsonb(wk) where key = 'current_week';
  update public.league_settings set value = to_jsonb(coalesce(public.setting_int('league_clock'), 0) + 1) where key = 'league_clock';
  cut := public.trade_request_deadline();
  mor := public.refresh_morale(true);
  depth := public.bot_set_depth_all();
  perform public.log_event('week', null, null, format('Week %s is here', wk), jsonb_build_object('week', wk, 'bots', bots, 'depth_moves', depth));
  perform public.notify(null, false, true, 'week', format('Week %s is here', wk), 'Check your matchup and your inbox.', jsonb_build_object('week', wk));
  perform public.data_audit();
  return jsonb_build_object('week', wk, 'bots', bots, 'morale', mor, 'cut', cut, 'depth', depth);
end $function$;
