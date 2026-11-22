-- 091: the league moves on past every finished week. Before, finishing a game only moved the week on when that game was in
-- the current week, so a week finished early (simmed ahead, or played out of order) left the league stuck behind it.
-- catch_up_week: while every game of the current week is final (and it isn't the last week), go to the next week.
create or replace function public.catch_up_week(p_season int)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare cw int; last_wk int; moved jsonb; n int := 0;
begin
  select max(week) into last_wk from public.games where season = p_season and kind = 'regular';
  loop
    cw := coalesce(public.setting_int('current_week'), 1);
    exit when last_wk is null or cw >= last_wk or n >= 12
      or exists (select 1 from public.games where season = p_season and week = cw and kind = 'regular' and status <> 'final');
    begin moved := public.advance_week(); exception when others then return jsonb_build_object('error', sqlerrm); end;
    n := n + 1;
  end loop;
  return moved;
end $$;
revoke all on function public.catch_up_week(int) from public, anon, authenticated;

create or replace function public.game_finalize(p_game bigint, p_home integer, p_away integer, p_ot integer, p_seed bigint, p_receiver text, p_method text, p_teams jsonb, p_scoring jsonb, p_stats jsonb)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare g public.games; st public.game_state; moved jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game for update;
  if g.id is null then raise exception 'No such game'; end if;
  if g.status = 'final' then return jsonb_build_object('already', true, 'home', g.home_score, 'away', g.away_score); end if;
  select * into st from public.game_state where game_id = p_game;
  if st.seed is null or st.seed <> p_seed then raise exception 'This result does not match the game''s kickoff. Start the game again.'; end if;
  if p_home = p_away then raise exception 'A game can''t end in a tie'; end if;
  update public.games set status = 'final', home_score = p_home, away_score = p_away, played_at = now() where id = p_game;
  update public.game_state set status = 'final', home_score = p_home, away_score = p_away, clock_running = false, clock_left = 0, updated_at = now() where game_id = p_game;
  insert into public.game_results (game_id, season, week, seed, receiver, home_score, away_score, overtimes, teams, scoring, method, finalized_by)
  values (p_game, g.season, g.week, p_seed, p_receiver, p_home, p_away, coalesce(p_ot, 0), p_teams, p_scoring, p_method, auth.uid());
  insert into public.player_game_stats (game_id, player_id, team_id, season, week, stats)
  select p_game, s->>'player_id', s->>'team_id', g.season, g.week, s->'stats'
  from jsonb_array_elements(coalesce(p_stats, '[]'::jsonb)) s
  where s->>'team_id' in (g.home_team, g.away_team) and exists (select 1 from public.players p where p.id = s->>'player_id')
  on conflict do nothing;
  perform public.refresh_team_records(g.season);
  if g.kind = 'regular' then moved := public.catch_up_week(g.season); end if;   -- every finished week, not just this game's
  return jsonb_build_object('ok', true, 'home', p_home, 'away', p_away, 'week', moved);
end $function$;
