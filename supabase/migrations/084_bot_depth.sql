-- Bot depth charts: every bot-run team (and every team while test mode is on) starts its best players, re-checked each game
-- week and at kickoff. Best = stars, but the coach's profile can bend it a little: a youth-loving coach (or a rebuilding
-- plan) may start a young high-potential player up to half a star behind, to develop him; a win-now coach breaks ties
-- toward the veteran. Human coaches set their own depth chart by hand.

create or replace function public.bot_run_team(p_team text)
returns boolean language sql stable security definer set search_path to '' as $$
  select public.test_mode() or coalesce((select is_bot from public.teams where id = p_team), false)
$$;

create or replace function public.bot_set_depth(p_team text)
returns int language plpgsql security definer set search_path to '' as $$
declare youth int; plan text; moved int;
begin
  if not public.bot_run_team(p_team) then return 0; end if;
  select coalesce((c.brain->'values'->>'youth')::int, 50), c.plan into youth, plan from public.coaches c where c.team_id = p_team;
  youth := coalesce(youth, 50);
  with ranked as (
    select p.id, p.position, t.starters,
      row_number() over (partition by p.position order by
        p.stars
          + least(0.5,   -- developing a young player: never more than half a star of benefit of the doubt
              case when p.age <= 24 and coalesce(pp.potential, p.stars) >= p.stars + 1
                   then greatest(0, (youth - 50) / 100.0) + case when plan = 'rebuild' then 0.15 else 0 end else 0 end)
          + case when plan = 'win_now' and p.age >= 25 then 0.05 else 0 end desc,
        p.stars desc, p.age asc, p.id) as n
    from public.players p
    join public.roster_template t on t.position = p.position
    left join public.player_potential pp on pp.player_id = p.id
    where p.team_id = p_team and p.status = 'active'
  ), want as (
    select id, case when n <= starters then 'starter' else 'backup' end as depth, case when n <= starters then n else n - starters end as slot from ranked
  )
  update public.players p set depth = w.depth, slot = w.slot
  from want w where p.id = w.id and (p.depth is distinct from w.depth or p.slot is distinct from w.slot);
  get diagnostics moved = row_count;
  return moved;
end $$;
revoke execute on function public.bot_set_depth(text) from public, anon, authenticated;

create or replace function public.bot_set_depth_all()
returns int language plpgsql security definer set search_path to '' as $$
declare t record; n int := 0;
begin
  for t in select id from public.teams loop n := n + public.bot_set_depth(t.id); end loop;
  return n;
end $$;
revoke execute on function public.bot_set_depth_all() from public, anon, authenticated;

-- Weekly: before the new week starts, bots reset their depth charts.
create or replace function public.advance_week()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare wk int; bots jsonb; mor jsonb; cut int; depth int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'regular_season' then
    raise exception 'Game weeks start when the regular season begins'; end if;
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
end $$;

-- At kickoff: both teams' depth charts get a last look if a bot runs them (the lineups load right after).
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
  perform public.bot_set_depth(g.home_team);
  perform public.bot_set_depth(g.away_team);
  recv := case when random() < 0.5 then g.home_team else g.away_team end;
  dir := case when random() < 0.5 then 'left' else 'right' end;
  sd := floor(random() * 2147483647)::bigint;
  insert into public.game_state (game_id, status, receiving, possession, home_dir, down, togo, ball_on, seed)
  values (p_game, 'live', recv, recv, dir, 1, 10, 25, sd)
  on conflict (game_id) do update set status = 'live', receiving = recv, possession = recv, home_dir = dir, down = 1, togo = 10, ball_on = 25, seed = sd, updated_at = now();
  return jsonb_build_object('receiving', recv, 'home_dir', dir, 'seed', sd);
end $$;

select public.bot_set_depth_all();
