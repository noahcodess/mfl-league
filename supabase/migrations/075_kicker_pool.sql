-- Where kickers come from: free agency (any position can now be asked for by name) and the draft (2-3 a class, own
-- potential odds, never part of the random 5-star/4.5-star prospect picks, and they arrive 1 star under potential
-- instead of 2 because kickers are ready sooner). Then the first kickers, 3 tight ends and 2 centers join the league.

create or replace function public.college_profile(p players, pot numeric) returns jsonb language plpgsql set search_path to '' as $function$
declare q numeric := least(1, greatest(0, (pot - 1) / 4 + (random()::numeric - 0.5) * 0.25)); s jsonb; honors text[] := '{}';
  f numeric := 0.85 + random()::numeric * 0.3;
begin
  s := case
    when p.position = 'QB' then jsonb_build_array(
      jsonb_build_array('Pass yards', round((1800 + q * 2800) * f)), jsonb_build_array('Pass TD', round((10 + q * 30) * f)),
      jsonb_build_array('INT', round(14 - q * 9 + random()::numeric * 3)), jsonb_build_array('Comp %', round(55 + q * 14 + random()::numeric * 3, 1)))
    when p.position = 'RB' then jsonb_build_array(
      jsonb_build_array('Rush yards', round((600 + q * 1300) * f)), jsonb_build_array('Rush TD', round((5 + q * 15) * f)),
      jsonb_build_array('Yards/carry', round(4 + q * 2.5 + random()::numeric * 0.6, 1)), jsonb_build_array('Catches', round((10 + q * 25) * f)))
    when p.position = 'WR' then jsonb_build_array(
      jsonb_build_array('Catches', round((30 + q * 60) * f)), jsonb_build_array('Rec yards', round((400 + q * 1100) * f)),
      jsonb_build_array('Rec TD', round((3 + q * 12) * f)), jsonb_build_array('Long', round(35 + q * 45 + random()::numeric * 10)))
    when p.position = 'TE' then jsonb_build_array(
      jsonb_build_array('Catches', round((15 + q * 45) * f)), jsonb_build_array('Rec yards', round((200 + q * 600) * f)),
      jsonb_build_array('Rec TD', round((2 + q * 8) * f)), jsonb_build_array('Starts', 8 + floor(random()::numeric * 6)))
    when p.position in ('OT', 'OG', 'C') then jsonb_build_array(
      jsonb_build_array('Starts', 10 + floor(random()::numeric * 5)), jsonb_build_array('Sacks allowed', round(greatest(0, 6 - q * 5 + random()::numeric * 2))),
      jsonb_build_array('Pancakes', round((20 + q * 40) * f)), jsonb_build_array('Penalties', round(greatest(0, 7 - q * 5 + random()::numeric * 2))))
    when p.position in ('DL', 'DT') then jsonb_build_array(
      jsonb_build_array('Tackles', round((25 + q * 30) * f)), jsonb_build_array('Tackles for loss', round((4 + q * 10) * f)),
      jsonb_build_array('Sacks', round((2 + q * 8) * f, 1)), jsonb_build_array('QB hurries', round((5 + q * 15) * f)))
    when p.position = 'DE' then jsonb_build_array(
      jsonb_build_array('Tackles', round((30 + q * 30) * f)), jsonb_build_array('Tackles for loss', round((6 + q * 12) * f)),
      jsonb_build_array('Sacks', round((3 + q * 12) * f, 1)), jsonb_build_array('Forced fumbles', round(q * 4 * f)))
    when p.position = 'LB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((50 + q * 70) * f)), jsonb_build_array('Tackles for loss', round((4 + q * 10) * f)),
      jsonb_build_array('Sacks', round((1 + q * 6) * f, 1)), jsonb_build_array('INT', round(q * 3 * f)))
    when p.position = 'CB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((25 + q * 30) * f)), jsonb_build_array('INT', round((1 + q * 6) * f)),
      jsonb_build_array('Pass breakups', round((4 + q * 12) * f)), jsonb_build_array('Pick-sixes', round(q * 2 * f)))
    when p.position = 'K' then jsonb_build_array(
      jsonb_build_array('FG made', round((10 + q * 14) * f)), jsonb_build_array('FG %', round(66 + q * 26 + random()::numeric * 4, 1)),
      jsonb_build_array('Long FG', round(42 + q * 15 + random()::numeric * 4)), jsonb_build_array('Punt avg', round(38 + q * 8 + random()::numeric * 2, 1)))
    else jsonb_build_array(
      jsonb_build_array('Tackles', round((40 + q * 50) * f)), jsonb_build_array('INT', round((1 + q * 5) * f)),
      jsonb_build_array('Pass breakups', round((3 + q * 8) * f)), jsonb_build_array('Forced fumbles', round(q * 3 * f))) end;
  if q > 0.85 and random()::numeric < 0.6 then honors := honors || 'All-American'::text; end if;
  if q > 0.9 and random()::numeric < 0.25 then honors := honors || 'Conference Player of the Year'::text; end if;
  if q > 0.65 and random()::numeric < 0.5 then honors := honors || 'All-Conference First Team'::text;
  elsif q > 0.45 and random()::numeric < 0.35 then honors := honors || 'All-Conference Second Team'::text; end if;
  if random()::numeric < 0.12 then honors := honors || 'Team Captain'::text; end if;
  if random()::numeric < 0.05 then honors := honors || 'Bowl Game MVP'::text; end if;
  return jsonb_build_object('class', case when p.age >= 22 then 'Senior' else 'Junior (early entry)' end,
    'games', 11 + floor(random()::numeric * 4), 'stats', s, 'honors', to_jsonb(honors));
end $function$;

drop function if exists public.generate_free_agents(integer);
create or replace function public.generate_free_agents(p_count integer, p_position text default null) returns integer
 language plpgsql security definer set search_path to '' as $function$
declare
  season int := public.setting_int('current_season');
  intl_now numeric := (select count(*) filter (where nationality <> 'USA')::numeric / greatest(count(*), 1) from public.players where status <> 'retired');
  intl_chance numeric := least(0.35, greatest(0.10, (0.18 - intl_now) * 3 + 0.10));
  countries text[] := '{Nigeria,Nigeria,Ghana,Jamaica,Samoa,Samoa,Tonga,Canada,Canada,England,Australia,Germany,Mexico,Mexico,Brazil,France}';
  pos text; country text; nm text; age int; stars numeric; pot numeric; i int; tries int; pid text; made int := 0;
begin
  for i in 1 .. p_count loop
    pos := p_position;
    if pos is null then
      select rt.position into pos from public.roster_template rt   -- the position the league is shortest at (kickers: 20 is plenty)
        order by ((case when rt.position = 'K' then 20 else 16 * (rt.starters + rt.backups) end)
                  - (select count(*) from public.players x where x.position = rt.position and x.status = 'active' and x.team_id is not null)
                  - (select count(*) from public.players x where x.position = rt.position and x.status = 'free_agent')) + random() * 3 desc limit 1;
    end if;
    country := case when random() < intl_chance then countries[1 + floor(random() * array_length(countries, 1))::int] else 'USA' end;
    tries := 0;
    loop
      nm := public.random_name(country);
      exit when not exists (select 1 from public.players where name = nm) or tries > 20;
      tries := tries + 1;
    end loop;
    age := 21 + floor(random() * 6)::int;
    if pos = 'K' then
      pot := public.kicker_potential(false);
      stars := case when age <= 22 then greatest(2.5, pot - 0.5) else pot end;
    else
      stars := (array[1.5, 2, 2, 2, 2.5, 2.5, 2.5, 2.5, 3, 3, 3, 3.5])[1 + floor(random() * 12)::int];
      pot := least(case when season >= coalesce(public.setting_int('elite_rules_from_season'), 999) then 4 else 5 end, stars + case when age <= 22 then (array[1, 1.5, 2])[1 + floor(random() * 3)::int]
                                 when age <= 24 then (array[0, 0.5, 1, 1.5])[1 + floor(random() * 4)::int] else 0 end);
    end if;
    pid := format('fa%s-%s', season, substr(md5(random()::text), 1, 6));
    insert into public.players (id, team_id, name, position, depth, slot, stars, elite, age, mood, nationality, notes, status)
    values (pid, null, nm, pos, null, null, stars, false, age, 'normal', country, '{}', 'free_agent');
    insert into public.player_potential (player_id, potential) values (pid, pot);
    made := made + 1;
  end loop;
  return made;
end $function$;

drop function if exists public.generate_draft_class(integer, integer);
create or replace function public.generate_draft_class(p_season integer, p_count integer, p_position text default null) returns integer
 language plpgsql security definer set search_path to '' as $function$
declare
  intl_now numeric := (select count(*) filter (where nationality <> 'USA')::numeric / greatest(count(*), 1) from public.players where status in ('active', 'free_agent'));
  intl_chance numeric := least(0.35, greatest(0.10, (0.18 - intl_now) * 3 + 0.10));
  countries text[] := '{Nigeria,Nigeria,Ghana,Jamaica,Samoa,Samoa,Tonga,Canada,Canada,England,Australia,Germany,Mexico,Mexico,Brazil,France}';
  colleges text[] := public.college_names();
  plan text[]; pos text; country text; nm text; age int; pot numeric; stars numeric; pid text; tries int; made int := 0; pl public.players; n5 int; n45 int;
  slots int := (select sum(starters + backups) from public.roster_template where position <> 'K');
begin
  if p_position is not null then
    plan := array_fill(p_position, array[p_count]);
  else
    select array_agg(position order by random()) into plan from (
      select rt.position from public.roster_template rt,
        generate_series(1, case when rt.position = 'K' then public.kicker_class_count() else greatest(3, round((rt.starters + rt.backups)::numeric * p_count / slots)::int
          + least(2, greatest(0, (16 * (rt.starters + rt.backups)
            - (select count(*) from public.players x where x.position = rt.position and x.status in ('active', 'free_agent'))) / 8))) end) g) s;
  end if;
  foreach pos in array plan loop
    country := case when random() < intl_chance then countries[1 + floor(random() * array_length(countries, 1))::int] else 'USA' end;
    tries := 0;
    loop
      nm := public.random_name(country);
      exit when not exists (select 1 from public.players where name = nm) or tries > 25;
      tries := tries + 1;
    end loop;
    age := case when random() < 0.68 then 21 else 22 end;
    if pos = 'K' then
      pot := public.kicker_potential(true);
      stars := least(3.5, pot, greatest(1.5, pot - 1 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int]));
    else
      pot := case when p_season >= coalesce(public.setting_int('elite_rules_from_season'), 999)
        then (array[2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4])[1 + floor(random() * 17)::int]
        else (array[2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5])[1 + floor(random() * 20)::int] end;
      stars := least(3.5, pot, greatest(1, pot - 2 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int]));
    end if;
    pid := format('dr%s-%s', p_season, substr(md5(random()::text), 1, 6));
    insert into public.players (id, team_id, name, position, stars, elite, age, mood, nationality, notes, status, college, draft_season)
    values (pid, null, nm, pos, stars, false, age, 'normal', country, '{}', 'prospect',
            colleges[1 + floor(random() * array_length(colleges, 1))::int], p_season);
    insert into public.player_potential (player_id, potential) values (pid, pot);
    select * into pl from public.players where id = pid;
    update public.players set college_stats = public.college_profile(pl, pot) where id = pid;
    made := made + 1;
  end loop;
  if p_position is null and p_season >= coalesce(public.setting_int('elite_rules_from_season'), 999) then
    n5 := coalesce(public.setting_int('draft_pot5_min'), 2) + floor(random() * (coalesce(public.setting_int('draft_pot5_max'), 3) - coalesce(public.setting_int('draft_pot5_min'), 2) + 1))::int;
    n45 := coalesce(public.setting_int('draft_pot45_count'), 5);
    for pid, pot in select x.id, case when x.rn <= n5 then 5.0 else 4.5 end from (
        select id, row_number() over (order by random()) rn from public.players
        where status = 'prospect' and draft_season = p_season and position <> 'K') x
        where x.rn <= n5 + n45 loop
      update public.player_potential set potential = pot where player_id = pid;
      update public.players set stars = least(3.5, greatest(1, pot - 2 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int])) where id = pid;
      select * into pl from public.players where id = pid;
      update public.players set college_stats = public.college_profile(pl, pot) where id = pid;
    end loop;
  end if;
  return made;
end $function$;
