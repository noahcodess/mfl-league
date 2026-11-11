-- 055: team location + nickname (name = location + nickname), game order/time/Thursday night, and the matchup model
-- (win % and game rating from starters lined up against each other: WR1 vs CB1, tackles vs edge rushers, and so on).

alter table public.teams add column if not exists location text, add column if not exists nickname text;
update public.teams set location = regexp_replace(name, '\s+\S+$', ''), nickname = substring(name from '(\S+)$') where location is null;

drop function if exists public.commish_update_team(text, text, text, text, text, text);
create or replace function public.commish_update_team(p_team text, p_location text, p_nickname text, p_code text, p_conference text, p_color text, p_accent text) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare t public.teams; loc text := trim(coalesce(p_location, '')); nick text := trim(coalesce(p_nickname, '')); nm text; cd text := upper(trim(coalesce(p_code, '')));
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into t from public.teams where id = p_team;
  if t.id is null then raise exception 'No such team'; end if;
  if length(loc) < 2 or length(loc) > 28 then raise exception 'Location must be 2 to 28 characters'; end if;
  if length(nick) < 2 or length(nick) > 20 then raise exception 'Team name must be 2 to 20 characters'; end if;
  nm := loc || ' ' || nick;
  if cd !~ '^[A-Z]{2,4}$' then raise exception 'Abbreviation must be 2 to 4 letters'; end if;
  if exists (select 1 from public.teams where upper(code) = cd and id <> p_team) then raise exception 'Another team already uses %', cd; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' or p_accent !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Colors must look like #1a2b3c'; end if;
  if p_conference not in (select distinct conference from public.teams) then raise exception 'Pick a conference'; end if;
  if upper(t.code) <> cd then update public.picks set original_code = cd where upper(original_code) = upper(t.code); end if;
  update public.teams set name = nm, location = loc, nickname = nick, code = cd, conference = p_conference, color = lower(p_color), accent = lower(p_accent) where id = p_team;
  if nm <> t.name or cd <> upper(t.code) then
    perform public.log_event('team_edit', null, p_team, format('The %s (%s) are now the %s (%s)', t.name, upper(t.code), nm, cd));
    perform public.notify(null, false, true, 'team_edit', format('The %s are now the %s', t.name, nm), format('New abbreviation: %s.', cd), jsonb_build_object('team', p_team));
  end if;
end $$;

-- Game order inside a week, kickoff time, Thursday night.
alter table public.games add column if not exists slot int, add column if not exists starts_at timestamptz, add column if not exists prime text;

create or replace function public.set_week_order(p_season int, p_week int, p_ids bigint[]) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare i int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.games set slot = i where id = p_ids[i] and season = p_season and week = p_week;
  end loop;
end $$;

create or replace function public.set_game_time(p_game bigint, p_at timestamptz) returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.games set starts_at = p_at where id = p_game and status = 'scheduled';
  if not found then raise exception 'That game was already played'; end if;
end $$;

-- One Thursday night game per week.
create or replace function public.set_game_prime(p_game bigint, p_on boolean) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare g public.games;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'No such game'; end if;
  update public.games set prime = null where season = g.season and week = g.week and prime = 'thursday';
  if p_on then update public.games set prime = 'thursday' where id = p_game; end if;
end $$;

-- Swap two whole weeks (keeps every rule: still one game per team per week).
create or replace function public.swap_schedule_weeks(p_season int, p_a int, p_b int) returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if exists (select 1 from public.games where season = p_season and week in (p_a, p_b) and status <> 'scheduled') then raise exception 'Played weeks can''t move'; end if;
  update public.games set week = case when week = p_a then p_b else p_a end, starts_at = null where season = p_season and week in (p_a, p_b) and kind = 'regular';
end $$;

-- The matchup model. Each team's top two starters at every position (stars), then the units lined up against each other.
create or replace function public.team_units(p_team text) returns jsonb
language sql stable security definer set search_path to '' as $$
  with r as (select p.id, p.name, p.position, p.stars, row_number() over (partition by p.position order by p.stars desc nulls last, p.id) rn
             from public.players p where p.team_id = p_team and p.status = 'active')
  select coalesce(jsonb_object_agg(position || rn, jsonb_build_object('id', id, 'name', name, 'stars', stars)), '{}') from r where rn <= 2
$$;

create or replace function public.unit_star(u jsonb, k text) returns numeric
language sql immutable set search_path to '' as $$ select coalesce((u -> k ->> 'stars')::numeric, 1.5) $$;

-- How much better one team's offense is than the other's defense, unit by unit (stars). Weights add to 1.
create or replace function public.offense_edge(o jsonb, d jsonb) returns numeric
language sql immutable set search_path to '' as $$
  select 0.16 * (public.unit_star(o, 'WR1') - public.unit_star(d, 'CB1'))
       + 0.12 * (public.unit_star(o, 'WR2') - public.unit_star(d, 'CB2'))
       + 0.08 * (public.unit_star(o, 'TE1') - public.unit_star(d, 'SS1'))
       + 0.10 * (public.unit_star(o, 'RB1') - public.unit_star(d, 'LB1'))
       + 0.14 * (public.unit_star(o, 'QB1') - (public.unit_star(d, 'CB1') + public.unit_star(d, 'CB2') + public.unit_star(d, 'SS1')) / 3)
       + 0.16 * ((public.unit_star(o, 'OT1') + public.unit_star(o, 'OT2')) / 2 - (public.unit_star(d, 'DE1') + public.unit_star(d, 'DE2')) / 2)
       + 0.14 * ((public.unit_star(o, 'OG1') + public.unit_star(o, 'OG2') + public.unit_star(o, 'C1')) / 3
                 - (public.unit_star(d, 'DL1') + public.unit_star(d, 'DT1') + public.unit_star(d, 'DT2')) / 3)
       + 0.10 * ((public.unit_star(o, 'OG1') + public.unit_star(o, 'OG2') + public.unit_star(o, 'C1') + public.unit_star(o, 'OT1') + public.unit_star(o, 'OT2')) / 5
                 - (public.unit_star(d, 'LB1') + public.unit_star(d, 'LB2')) / 2)
$$;

-- Win chance and game rating for one matchup, plus the key one-on-one battles. Home field is worth a little; a better
-- game-planning coach is worth a little more.
create or replace function public.game_odds(p_home text, p_away text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare h jsonb := public.team_units(p_home); a jsonb := public.team_units(p_away); edge numeric; p numeric; q numeric; lop numeric; rating text;
  gp numeric := coalesce(((select ratings ->> 'game_planning' from public.coaches where team_id = p_home)::numeric
                        - (select ratings ->> 'game_planning' from public.coaches where team_id = p_away)::numeric) / 100, 0);
  keys jsonb := '[]'; pair record;
begin
  edge := public.offense_edge(h, a) - public.offense_edge(a, h);
  p := 1 / (1 + exp(-(1.1 * edge + 0.12 + 0.3 * gp)));
  q := (public.team_strength(p_home) + public.team_strength(p_away)) / 2;
  lop := abs(p - 0.5);
  rating := case when lop >= 0.32 then 'blowout' when lop <= 0.10 and q >= 4.0 then 'great'
                 when (lop <= 0.15 and q >= 3.7) or (lop <= 0.10 and q >= 3.5) then 'good' when lop <= 0.25 then 'okay' else 'bad' end;
  for pair in select * from (values ('WR1', 'CB1', 'WR1 vs CB1'), ('WR2', 'CB2', 'WR2 vs CB2'), ('TE1', 'SS1', 'TE vs safety'),
                                    ('RB1', 'LB1', 'RB vs LB'), ('OT1', 'DE1', 'Tackle vs edge'), ('OT2', 'DE2', 'Tackle vs edge')) v(o, d, label) loop
    keys := keys || jsonb_build_object('label', pair.label, 'side', 'home', 'off', h -> pair.o, 'def', a -> pair.d, 'diff', public.unit_star(h, pair.o) - public.unit_star(a, pair.d))
                 || jsonb_build_object('label', pair.label, 'side', 'away', 'off', a -> pair.o, 'def', h -> pair.d, 'diff', public.unit_star(a, pair.o) - public.unit_star(h, pair.d));
  end loop;
  select coalesce(jsonb_agg(k order by abs((k ->> 'diff')::numeric) desc), '[]') into keys from (select k from jsonb_array_elements(keys) k limit 12) x;
  return jsonb_build_object('home_win', round(p, 3), 'away_win', round(1 - p, 3), 'rating', rating, 'quality', round(q, 2),
    'keys', (select coalesce(jsonb_agg(k), '[]') from (select k from jsonb_array_elements(keys) k limit 4) y));
end $$;

-- Every game of a season with its odds, for the schedule screens.
create or replace function public.season_games(p_season int) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'week', g.week, 'slot', g.slot, 'home', g.home_team, 'away', g.away_team,
    'conference', g.conference_game, 'status', g.status, 'starts_at', g.starts_at, 'prime', g.prime,
    'home_score', g.home_score, 'away_score', g.away_score, 'odds', public.game_odds(g.home_team, g.away_team))
    order by g.week, g.slot nulls last, g.id), '[]')
  from public.games g where g.season = p_season and g.kind = 'regular'
$$;
grant execute on function public.season_games(int) to anon, authenticated;
grant execute on function public.game_odds(text, text) to anon, authenticated;
