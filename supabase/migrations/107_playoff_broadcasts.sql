-- 107: playoff broadcasts. Playoff games air on a network's main broadcast (FOX, CBS, NBC = its Sunday night look, ESPN =
-- its Saturday/Monday night look; Thursday Night Football never airs playoffs) with the network's own logo. The rounds
-- are handed out at random (every Quarterfinal on a different network). The Craft Bowl's network is part of each
-- season's plan: random, never the same network two seasons in a row; the commissioner can change the network (not
-- the show). He can still put a Quarterfinal or Semifinal on a show like Saturday Night (not Thursday).

alter table public.craft_bowl_plans add column if not exists network text check (network in ('fox', 'cbs', 'nbc', 'espn'));

-- A network for this season's Craft Bowl that isn't the one before or after it.
create or replace function public.craft_bowl_pick_network(p_season int) returns text language sql volatile set search_path to '' as $function$
  select x from unnest(array['fox', 'cbs', 'nbc', 'espn']) x
  where x is distinct from (select network from public.craft_bowl_plans where season = p_season - 1)
    and x is distinct from (select network from public.craft_bowl_plans where season = p_season + 1)
  order by random() limit 1
$function$;

create or replace function public.craft_bowl_fill() returns void language plpgsql security definer set search_path to '' as $function$
declare cur int := coalesce(public.setting_int('current_season'), 1); s int; pick text;
begin
  for s in cur .. cur + 6 loop
    insert into public.craft_bowl_plans (season) values (s) on conflict do nothing;
    if (select stadium_team from public.craft_bowl_plans where season = s) is null then
      select id into pick from public.craft_bowl_open_stadiums(s) id order by random() limit 1;
      update public.craft_bowl_plans set stadium_team = pick where season = s;
    end if;
    if (select network from public.craft_bowl_plans where season = s) is null then
      update public.craft_bowl_plans set network = public.craft_bowl_pick_network(s) where season = s;
    end if;
  end loop;
end $function$;

-- The commissioner picks the Craft Bowl's network (never the same as the season before or after). If the game is already
-- set and not played, it moves to that network too.
create or replace function public.craft_bowl_set_network(p_season int, p_network text) returns text language plpgsql security definer set search_path to '' as $function$
declare cur int := coalesce(public.setting_int('current_season'), 1); nm text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_network not in ('fox', 'cbs', 'nbc', 'espn') then raise exception 'Pick FOX, CBS, NBC or ESPN'; end if;
  if p_season < cur or p_season > cur + 6 then raise exception 'You can only set this season and the next 6.'; end if;
  nm := upper(p_network);
  if exists (select 1 from public.craft_bowl_plans where season = p_season - 1 and network = p_network) then
    raise exception '% has the Season % Craft Bowl. A network can''t have it two seasons in a row.', nm, p_season - 1; end if;
  if exists (select 1 from public.craft_bowl_plans where season = p_season + 1 and network = p_network) then
    raise exception '% already has the Season % Craft Bowl. A network can''t have it two seasons in a row.', nm, p_season + 1; end if;
  insert into public.craft_bowl_plans (season, network) values (p_season, p_network)
  on conflict (season) do update set network = excluded.network, updated_at = now();
  update public.games set prime = p_network where season = p_season and kind = 'craft_bowl' and status <> 'final';
  return p_network;
end $function$;

create or replace function public.set_game_window(p_game bigint, p_window text) returns void language plpgsql security definer set search_path to '' as $function$
declare g public.games;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_window is not null and p_window not in ('thu_night', 'sat_day', 'sat_night', 'sun_day', 'sun_night', 'mon_night', 'fox', 'cbs', 'nbc', 'espn') then raise exception 'Unknown broadcast window'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'No such game'; end if;
  if g.kind = 'craft_bowl' then
    if p_window is null or p_window not in ('fox', 'cbs', 'nbc', 'espn') then raise exception 'The Craft Bowl gets a network (FOX, CBS, NBC or ESPN), not a show'; end if;
    perform public.craft_bowl_set_network(g.season, p_window);
    return;
  elsif g.kind in ('quarterfinal', 'semifinal') then
    if p_window = 'thu_night' then raise exception 'Thursday Night Football doesn''t air playoff games'; end if;
  elsif p_window in ('fox', 'cbs', 'nbc', 'espn') then raise exception 'Network-only broadcasts are for playoff games. Pick a window.'; end if;
  if p_window like '%night' and g.kind = 'regular' then
    update public.games set prime = null where season = g.season and week = g.week and kind = 'regular' and prime = p_window and id <> g.id;
  end if;
  update public.games set prime = p_window where id = p_game;
  if g.kind = 'regular' then
    update public.games x set slot = o.rn from (
      select id, row_number() over (order by public.window_order(prime), slot nulls last, id) rn from public.games
      where season = g.season and week = g.week and kind = 'regular') o where x.id = o.id;
  end if;
end $function$;

-- advance_playoffs (103) patched in place: every game gets a network as it's created.
do $patch$
declare d text := pg_get_functiondef('public.advance_playoffs(jsonb)'::regprocedure); n text;
begin
  n := replace(d, 'label text; next_wk int;', E'label text; next_wk int;\n  nets text[] := (select array_agg(x order by random()) from unnest(array[''fox'', ''cbs'', ''nbc'', ''espn'']) x);');
  n := replace(n, E'insert into public.games (season, week, home_team, away_team, kind, conference_game) values\n        (v_season, 14, p_seeds->c->>0, p_seeds->c->>3, ''quarterfinal'', true), (v_season, 14, p_seeds->c->>1, p_seeds->c->>2, ''quarterfinal'', true);',
    E'insert into public.games (season, week, home_team, away_team, kind, conference_game, prime) values\n        (v_season, 14, p_seeds->c->>0, p_seeds->c->>3, ''quarterfinal'', true, nets[n + 1]), (v_season, 14, p_seeds->c->>1, p_seeds->c->>2, ''quarterfinal'', true, nets[n + 2]);');
  n := replace(n, 'insert into public.games (season, week, home_team, away_team, kind, conference_game) values (v_season, 15, a, b, ''semifinal'', true);',
    'insert into public.games (season, week, home_team, away_team, kind, conference_game, prime) values (v_season, 15, a, b, ''semifinal'', true, nets[n + 1]);');
  n := replace(n, 'insert into public.games (season, week, home_team, away_team, kind, conference_game) values (v_season, 16, a, b, ''craft_bowl'', false);',
    E'perform public.craft_bowl_fill();\n      insert into public.games (season, week, home_team, away_team, kind, conference_game, prime)\n      values (v_season, 16, a, b, ''craft_bowl'', false, coalesce((select network from public.craft_bowl_plans where season = v_season), nets[1]));');
  if (length(n) - length(d)) < 250 or n not like '%nets[n + 2]%' or n not like '%''semifinal'', true, nets%' or n not like '%craft_bowl_fill%' or n not like '%nets text[]%' then raise exception 'advance_playoffs patch did not apply fully'; end if;
  execute n;
end $patch$;

-- the seasons already planned get a network too (in order, so no repeats)
do $fill$
declare s int;
begin
  for s in select season from public.craft_bowl_plans where network is null order by season loop
    update public.craft_bowl_plans set network = public.craft_bowl_pick_network(s) where season = s;
  end loop;
end $fill$;
