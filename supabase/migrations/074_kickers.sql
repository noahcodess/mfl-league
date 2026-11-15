-- Kickers: one player kicks AND punts. Ratings, archetypes, body, numbers, pay scale, a roster spot (1 starter + 1 backup),
-- rarity rules (4.5 stars is the usual ceiling, 5-star kickers are once-in-a-long-while), and the first ones in the league.

insert into public.attribute_defs (position, ord, key, label) values
('K', 1, 'kick_power', 'Kick Power'), ('K', 2, 'kick_accuracy', 'Kick Accuracy'), ('K', 3, 'punt_power', 'Punt Power'),
('K', 4, 'punt_accuracy', 'Punt Accuracy'), ('K', 5, 'tackling', 'Tackling'), ('K', 6, 'speed', 'Speed'), ('K', 7, 'toughness', 'Toughness')
on conflict do nothing;
insert into public.style_defs (position, style, label, boosts, drops) values
('K', 'big_leg', 'Big Leg', '{kick_power,punt_power}', '{kick_accuracy}'),
('K', 'sniper', 'Sniper', '{kick_accuracy,punt_accuracy}', '{kick_power}'),
('K', 'kick_specialist', 'Kick Specialist', '{kick_power,kick_accuracy}', '{punt_power,punt_accuracy}'),
('K', 'punt_specialist', 'Punt Specialist', '{punt_power,punt_accuracy}', '{kick_power,kick_accuracy}')
on conflict do nothing;
insert into public.roster_template (position, starters, backups) values ('K', 1, 1) on conflict do nothing;

insert into public.league_settings (key, value) values ('k_pot5_pct', '5'), ('k_pot45_max', '2') on conflict (key) do nothing;

-- A free agent can carry a set asking contract (used to start every kicker on the same deal). Cleared once he signs.
alter table public.players add column if not exists fa_ask integer, add column if not exists fa_ask_years integer;
create or replace function public.players_clear_fa_ask() returns trigger language plpgsql set search_path to '' as $$
begin
  if old.status = 'free_agent' and new.status is distinct from 'free_agent' then new.fa_ask := null; new.fa_ask_years := null; end if;
  return new;
end $$;
drop trigger if exists players_clear_fa_ask on public.players;
create trigger players_clear_fa_ask before update of status on public.players for each row execute function public.players_clear_fa_ask();

create or replace function public.body_base(p_position text, out h numeric, out w numeric, out h_sd numeric, out w_sd numeric)
 returns record language sql immutable set search_path to '' as $function$
  select bh, bw, hs, ws from (values
    ('QB', 75.0, 222, 1.5, 9), ('RB', 70.8, 214, 1.6, 11), ('WR', 72.6, 200, 2.0, 11), ('TE', 76.6, 250, 1.2, 9),
    ('OT', 77.8, 316, 1.1, 9), ('OG', 76.2, 314, 1.1, 9), ('C', 75.4, 305, 1.0, 8), ('DL', 75.4, 292, 1.5, 15),
    ('DT', 75.0, 308, 1.3, 11), ('DE', 76.0, 270, 1.4, 11), ('LB', 74.2, 238, 1.3, 9), ('CB', 71.8, 194, 1.6, 8),
    ('SS', 72.4, 206, 1.4, 8), ('K', 73.0, 192, 1.8, 10)) v(pos, bh, bw, hs, ws)
  where pos = p_position
$function$;

create or replace function public.speed_offset(p_position text) returns integer language sql immutable set search_path to '' as $function$
  select case p_position when 'WR' then 6 when 'CB' then 6 when 'RB' then 5 when 'SS' then 3 when 'LB' then 0 when 'DE' then -2
    when 'TE' then -4 when 'QB' then -6 when 'DL' then -12 when 'DT' then -12 when 'K' then -14 else -20 end
$function$;

create or replace function public.assign_number(p_team text, p_position text) returns integer language plpgsql security definer set search_path to '' as $function$
declare ranges int[][]; lo int; hi int; n int; i int;
begin
  ranges := case p_position
    when 'QB' then array[[1, 19]] when 'RB' then array[[0, 9], [20, 49]] when 'WR' then array[[0, 19], [80, 89]]
    when 'TE' then array[[80, 89], [40, 49]] when 'C' then array[[50, 79]] when 'OG' then array[[60, 79], [50, 59]]
    when 'OT' then array[[60, 79], [50, 59]] when 'DL' then array[[90, 99], [50, 79]] when 'DT' then array[[90, 99], [50, 79]]
    when 'DE' then array[[90, 99], [40, 59]] when 'LB' then array[[0, 9], [40, 59]] when 'CB' then array[[0, 9], [20, 39]]
    when 'SS' then array[[0, 9], [20, 49]] when 'K' then array[[1, 19], [90, 99]] else array[[0, 99]] end;
  for i in 1 .. array_length(ranges, 1) loop
    lo := ranges[i][1]; hi := ranges[i][2];
    select g into n from generate_series(lo, hi) g
      where not exists (select 1 from public.players x where x.team_id = p_team and x.number = g) order by random() limit 1;
    if n is not null then return n; end if;
  end loop;
  select g into n from generate_series(0, 99) g where not exists (select 1 from public.players x where x.team_id = p_team and x.number = g) order by random() limit 1;
  return n;
end $function$;

-- Kickers are slow and can't tackle much (Speed comes from speed_offset, Tackling sits well under his other bars).
create or replace function public.generate_attributes(p_id text) returns void language plpgsql security definer set search_path to '' as $function$
declare p public.players; target numeric; d record; raw numeric[] := '{}'; keys text[] := '{}'; shift numeric; i int; out jsonb := '{}';
begin
  select * into p from public.players where id = p_id;
  if p.id is null then return; end if;
  target := public.rating_target(p.stars) + (case when p.elite then 2 else 0 end);
  for d in select key from public.attribute_defs where position = p.position order by ord loop
    keys := keys || d.key;
    raw := raw || ((random() + random() + random() - 1.5) * 16)::numeric;
  end loop;
  if array_length(keys, 1) is null then return; end if;
  select avg(x) into shift from unnest(raw) x;
  for i in 1 .. array_length(keys, 1) loop
    out := out || jsonb_build_object(keys[i], least(99, greatest(25, round(case
      when keys[i] = 'toughness' then (target + raw[i] - shift) * 0.5 + (50 + random() * 45) * 0.5
      when keys[i] = 'speed' then least(97, target + raw[i] - shift + public.speed_offset(p.position))
      when keys[i] = 'tackling' and p.position = 'K' then target + raw[i] - shift - 24
      else target + raw[i] - shift end)))::int);
  end loop;
  insert into public.player_attributes (player_id, ratings) values (p_id, out)
    on conflict (player_id) do update set ratings = excluded.ratings, updated_at = now();
  perform public.refresh_ceilings(p_id);
end $function$;

-- Pay: kickers sit on the same scale as everyone, shrunk the way the NFL shrinks them. The NFL's top kicker makes $7M a
-- year against $42.15M for its top receiver (0.166x); receivers here carry a 1.1 multiplier, so kickers get 0.2.
create or replace function public.market_value(p players) returns integer language sql stable set search_path to '' as $function$
  select public.round5k(
    (case p.stars when 0.5 then 19000 when 1 then 28000 when 1.5 then 38000 when 2 then 47000 when 2.5 then 61000 when 3 then 80000
                  when 3.5 then 93000 when 4 then 117000 when 4.5 then 150000 when 5 then 198000 else 47000 end)
    * (case when p.elite then 1.15 else 1 end)
    * (case p.position when 'QB' then 1.25 when 'WR' then 1.1 when 'DE' then 1.1 when 'OT' then 1.1
                       when 'TE' then 0.9 when 'OG' then 0.9 when 'C' then 0.9 when 'DT' then 0.9 when 'SS' then 0.9 when 'K' then 0.2 else 1 end)
    * (case p.age when 21 then 0.9 when 22 then 0.9 when 26 then 0.95 when 27 then 0.85 else 1 end)
    * (case when p.depth = 'backup' then 0.85 else 1 end))
$function$;

create or replace function public.ask_price(p players) returns integer language plpgsql stable security definer set search_path to '' as $function$
declare pot numeric; t public.player_traits; growth numeric := 1;
begin
  if p.status = 'free_agent' and p.fa_ask is not null then return p.fa_ask; end if;
  select potential into pot from public.player_potential where player_id = p.id;
  select * into t from public.player_traits where player_id = p.id;
  if p.age <= 24 and pot > p.stars then growth := 1 + 0.15 * (pot - p.stars); end if;
  return least(1000000, public.round5k(public.market_value(p) * growth * coalesce(t.greed, 1)
    * (case p.mood when 'angry' then 1.12 when 'unhappy' then 1.08 when 'happy' then 0.95 when 'excited' then 0.92 else 1 end)));
end $function$;

create or replace function public.preferred_years(p players) returns integer language sql stable security definer set search_path to '' as $function$
  select least(public.max_years(p), case
    when p.status = 'free_agent' and p.fa_ask_years is not null then p.fa_ask_years
    when (select archetype from public.player_traits where player_id = p.id) = 'prove_it' then 1
    when p.age <= 23 and coalesce((select potential from public.player_potential where player_id = p.id), p.stars) > p.stars then 2
    when p.age <= 25 then 3 else 1 end)
$function$;

-- A kicker's potential. Most land at 3.5 or 4; 4.5 is rare (and rarer once 2 are already around); only draft
-- prospects can roll a 5 (k_pot5_pct, default 5% each: with 2-3 kickers a class that's one about every 8 seasons).
create or replace function public.kicker_potential(p_draft boolean) returns numeric language plpgsql volatile security definer set search_path to '' as $function$
declare n45 int; r numeric := random();
begin
  select count(*) into n45 from public.players p join public.player_potential pp on pp.player_id = p.id
    where p.position = 'K' and p.status in ('active', 'free_agent', 'prospect') and pp.potential >= 4.5;
  if p_draft and r * 100 < coalesce(public.setting_int('k_pot5_pct'), 5) then return 5; end if;
  r := random();
  return case when r < (case when n45 >= coalesce(public.setting_int('k_pot45_max'), 2) then 0.03 else 0.12 end) then 4.5
              when r < 0.45 then 4 when r < 0.85 then 3.5 else 3 end;
end $function$;

-- How many kickers a draft class gets: 2 or 3, plus 1 while the league is short of them.
create or replace function public.kicker_class_count() returns integer language sql volatile security definer set search_path to '' as $function$
  select 2 + floor(random() * 2)::int + case when (select count(*) from public.players where position = 'K' and status in ('active', 'free_agent')) < 20 then 1 else 0 end
$function$;
