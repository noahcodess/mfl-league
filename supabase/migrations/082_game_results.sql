-- Official game results: every game (watched or quick-simmed) is played by the same engine from a seed the server picks at
-- kickoff, then saved here with every player's stats. Records (team_seasons) are rebuilt from final games.

alter table public.game_state add column if not exists seed bigint;

create table if not exists public.game_results (
  game_id bigint primary key references public.games(id) on delete cascade,
  season int not null, week int not null, seed bigint, receiver text,
  home_score int not null, away_score int not null, overtimes int not null default 0,
  teams jsonb, scoring jsonb, method text not null check (method in ('watched', 'quick', 'auto')),
  finalized_at timestamptz not null default now(), finalized_by uuid
);
create table if not exists public.player_game_stats (
  game_id bigint not null references public.games(id) on delete cascade,
  player_id text not null, team_id text not null references public.teams(id) on update cascade,
  season int not null, week int not null, stats jsonb not null,
  primary key (game_id, player_id)
);
create index if not exists player_game_stats_player on public.player_game_stats (player_id, season);
create index if not exists player_game_stats_week on public.player_game_stats (season, week);
alter table public.game_results enable row level security;
alter table public.player_game_stats enable row level security;
drop policy if exists game_results_read on public.game_results;
create policy game_results_read on public.game_results for select using (true);
drop policy if exists player_game_stats_read on public.player_game_stats;
create policy player_game_stats_read on public.player_game_stats for select using (true);

-- Kickoff: coin flip plus the game's seed. Once a game is under way the same flip and seed come back every time.
create or replace function public.game_start(p_game bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.games; st public.game_state; recv text; dir text; sd bigint;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'No such game'; end if;
  select * into st from public.game_state where game_id = p_game;
  if st.game_id is not null and st.status <> 'pregame' and st.seed is not null then
    return jsonb_build_object('receiving', st.receiving, 'home_dir', st.home_dir, 'seed', st.seed, 'already', true, 'final', g.status = 'final');
  end if;
  recv := case when random() < 0.5 then g.home_team else g.away_team end;
  dir := case when random() < 0.5 then 'left' else 'right' end;
  sd := floor(random() * 2147483647)::bigint;
  insert into public.game_state (game_id, status, receiving, possession, home_dir, down, togo, ball_on, seed)
  values (p_game, 'live', recv, recv, dir, 1, 10, 25, sd)
  on conflict (game_id) do update set status = 'live', receiving = recv, possession = recv, home_dir = dir, down = 1, togo = 10, ball_on = 25, seed = sd, updated_at = now();
  return jsonb_build_object('receiving', recv, 'home_dir', dir, 'seed', sd);
end $$;

-- Rebuilds every team's record for a season from its final regular-season games. Seeds and playoff results are kept ('missed' until the bracket sets it).
create or replace function public.refresh_team_records(p_season int)
returns void language sql security definer set search_path to '' as $$
  update public.team_seasons set wins = 0, losses = 0, conf_wins = 0, conf_losses = 0, points_for = 0, points_against = 0 where season = p_season;
  with side as (
    select home_team team, home_score pf, away_score pa, conference_game conf from public.games where season = p_season and kind = 'regular' and status = 'final'
    union all
    select away_team, away_score, home_score, conference_game from public.games where season = p_season and kind = 'regular' and status = 'final'
  ), t as (
    select team, count(*) filter (where pf > pa) w, count(*) filter (where pf < pa) l,
      count(*) filter (where conf and pf > pa) cw, count(*) filter (where conf and pf < pa) cl, sum(pf) pf, sum(pa) pa from side group by team
  )
  insert into public.team_seasons (team_id, season, wins, losses, conf_wins, conf_losses, points_for, points_against, playoff)
  select team, p_season, w, l, cw, cl, pf, pa, 'missed' from t
  on conflict (team_id, season) do update set wins = excluded.wins, losses = excluded.losses, conf_wins = excluded.conf_wins,
    conf_losses = excluded.conf_losses, points_for = excluded.points_for, points_against = excluded.points_against;
$$;
revoke execute on function public.refresh_team_records(int) from public, anon, authenticated;

-- Makes a game final: score, every player's stats, the team records. A final game can never be changed by a second run.
-- When it's the last game of the current week, the league moves on to the next week.
create or replace function public.game_finalize(p_game bigint, p_home int, p_away int, p_ot int, p_seed bigint, p_receiver text,
  p_method text, p_teams jsonb, p_scoring jsonb, p_stats jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.games; st public.game_state; last_wk int; moved jsonb;
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
  if g.kind = 'regular' and coalesce(public.setting_int('current_week'), 1) = g.week
     and not exists (select 1 from public.games where season = g.season and week = g.week and kind = 'regular' and status <> 'final') then
    select max(week) into last_wk from public.games where season = g.season and kind = 'regular';
    if g.week < last_wk then
      begin moved := public.advance_week(); exception when others then moved := jsonb_build_object('error', sqlerrm); end;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'home', p_home, 'away', p_away, 'week', moved);
end $$;

-- Test mode only: puts a final game back to unplayed (wipes its result and stats, rebuilds records).
create or replace function public.game_unfinalize(p_game bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.games;
begin
  if not public.is_commissioner() or not public.test_mode() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'No such game'; end if;
  delete from public.player_game_stats where game_id = p_game;
  delete from public.game_results where game_id = p_game;
  delete from public.game_state where game_id = p_game;
  update public.games set status = 'scheduled', home_score = null, away_score = null, played_at = null where id = p_game;
  perform public.refresh_team_records(g.season);
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.game_finalize(bigint, int, int, int, bigint, text, text, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.game_unfinalize(bigint) from public, anon;
grant execute on function public.game_finalize(bigint, int, int, int, bigint, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.game_unfinalize(bigint) to authenticated;
