-- 102: the draft board. Every prospect's last college season is a 12-game season (10-11 if he missed time), and his
-- stats earn a public college grade. The board lists prospects by that grade: right near the top, looser further down
-- (a 3.5 can sneak into picks 10-20), and each class hides 1 or 2 gems: a real 4 or 4.5 potential whose college year
-- looked like a 3 to 3.5, so he sits in the middle or late part of the board. Bot GMs judge prospects by the board too
-- (a talent scout also trusts his own read), so a gem isn't sniped just because a bot can see the hidden number.

create or replace function public.college_profile(p public.players, pot numeric) returns jsonb language plpgsql set search_path to '' as $function$
declare
  sd numeric := 0.04 + 0.02 * (5 - pot);   -- tight at the top, looser lower down
  q numeric := least(1, greatest(0, (pot - 1) / 4 + (random() + random() + random() + random() + random() + random() - 3)::numeric / 0.7071 * sd));
  g int := case when random() < 0.8 then 12 else 10 + floor(random() * 2)::int end;
  m numeric := g / 12.0;
  f numeric := 0.94 + random()::numeric * 0.12;
  s jsonb; honors text[] := '{}';
begin
  s := case
    when p.position = 'QB' then jsonb_build_array(
      jsonb_build_array('Pass yards', round((1700 + q * 2500) * m * f)), jsonb_build_array('Pass TD', round((9 + q * 28) * m * f)),
      jsonb_build_array('INT', round((13 - q * 9 + random()::numeric * 2) * m)), jsonb_build_array('Comp %', round(55 + q * 14 + random()::numeric * 2, 1)))
    when p.position = 'RB' then jsonb_build_array(
      jsonb_build_array('Rush yards', round((550 + q * 1150) * m * f)), jsonb_build_array('Rush TD', round((4 + q * 14) * m * f)),
      jsonb_build_array('Yards/carry', round(4 + q * 2.4 + random()::numeric * 0.4, 1)), jsonb_build_array('Catches', round((8 + q * 24) * m * f)))
    when p.position = 'WR' then jsonb_build_array(
      jsonb_build_array('Catches', round((28 + q * 62) * m * f)), jsonb_build_array('Rec yards', round((380 + q * 950) * m * f)),
      jsonb_build_array('Rec TD', round((2 + q * 11) * m * f)), jsonb_build_array('Long', round(35 + q * 45 + random()::numeric * 8)))
    when p.position = 'TE' then jsonb_build_array(
      jsonb_build_array('Catches', round((14 + q * 42) * m * f)), jsonb_build_array('Rec yards', round((180 + q * 560) * m * f)),
      jsonb_build_array('Rec TD', round((1 + q * 8) * m * f)), jsonb_build_array('Starts', least(g, 7 + round(q * 5))))
    when p.position in ('OT', 'OG', 'C', 'OL') then jsonb_build_array(
      jsonb_build_array('Starts', least(g, 8 + round(q * 4))), jsonb_build_array('Sacks allowed', round(greatest(0, (6 - q * 5 + random()::numeric) * m))),
      jsonb_build_array('Pancakes', round((18 + q * 38) * m * f)), jsonb_build_array('Penalties', round(greatest(0, (7 - q * 5 + random()::numeric) * m))))
    when p.position in ('DL', 'DT') then jsonb_build_array(
      jsonb_build_array('Tackles', round((22 + q * 28) * m * f)), jsonb_build_array('Tackles for loss', round((3 + q * 10) * m * f)),
      jsonb_build_array('Sacks', round((1.5 + q * 8) * m * f, 1)), jsonb_build_array('QB hurries', round((4 + q * 14) * m * f)))
    when p.position = 'DE' then jsonb_build_array(
      jsonb_build_array('Tackles', round((26 + q * 28) * m * f)), jsonb_build_array('Tackles for loss', round((5 + q * 11) * m * f)),
      jsonb_build_array('Sacks', round((2.5 + q * 11) * m * f, 1)), jsonb_build_array('Forced fumbles', round(q * 4 * m * f)))
    when p.position = 'LB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((45 + q * 65) * m * f)), jsonb_build_array('Tackles for loss', round((3 + q * 10) * m * f)),
      jsonb_build_array('Sacks', round((1 + q * 6) * m * f, 1)), jsonb_build_array('INT', round(q * 3 * m * f)))
    when p.position = 'CB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((22 + q * 28) * m * f)), jsonb_build_array('INT', round((1 + q * 6) * m * f)),
      jsonb_build_array('Pass breakups', round((4 + q * 12) * m * f)), jsonb_build_array('Pick-sixes', round(q * 2 * m * f)))
    when p.position = 'K' then jsonb_build_array(
      jsonb_build_array('FG made', round((9 + q * 13) * m * f)), jsonb_build_array('FG %', round(66 + q * 26 + random()::numeric * 3, 1)),
      jsonb_build_array('Long FG', round(42 + q * 15 + random()::numeric * 3)), jsonb_build_array('Punt avg', round(38 + q * 8 + random()::numeric * 1.5, 1)))
    else jsonb_build_array(
      jsonb_build_array('Tackles', round((36 + q * 48) * m * f)), jsonb_build_array('INT', round((1 + q * 5) * m * f)),
      jsonb_build_array('Pass breakups', round((3 + q * 8) * m * f)), jsonb_build_array('Forced fumbles', round(q * 3 * m * f))) end;
  if q > 0.85 and random() < 0.6 then honors := honors || 'All-American'::text; end if;
  if q > 0.9 and random() < 0.25 then honors := honors || 'Conference Player of the Year'::text; end if;
  if q > 0.65 and random() < 0.5 then honors := honors || 'All-Conference First Team'::text;
  elsif q > 0.45 and random() < 0.35 then honors := honors || 'All-Conference Second Team'::text; end if;
  if random() < 0.12 then honors := honors || 'Team Captain'::text; end if;
  if random() < 0.05 then honors := honors || 'Bowl Game MVP'::text; end if;
  return jsonb_build_object('class', case when p.age >= 22 then 'Senior' else 'Junior (early entry)' end, 'games', g, 'stats', s,
    'honors', to_jsonb(honors), 'grade', least(99, greatest(1, round(q * case when p.position = 'K' then 80 else 100 end))));
end $function$;

-- After the class is made: hide 1 gem (35% of the time 2). A real 4 or 4.5 with a 3 to 3.5 college year and a matching
-- rating today, so nothing on the board gives him away.
create or replace function public.hide_draft_gems(p_season int) returns int language plpgsql security definer set search_path to '' as $function$
declare pid text; shown numeric; pl public.players; n int := 0;
begin
  for pid in select id from public.players pr join public.player_potential pp on pp.player_id = pr.id
      where pr.status = 'prospect' and pr.draft_season = p_season and pr.position <> 'K' and pp.potential in (4, 4.5)
      order by random() limit 1 + (random() < 0.35)::int loop
    shown := 3 + floor(random() * 2) * 0.5;
    update public.players set stars = least(3.5, greatest(1, shown - 2 + (array[-0.5, 0, 0, 0.5])[1 + floor(random() * 4)::int])) where id = pid;
    select * into pl from public.players where id = pid;
    update public.players set college_stats = public.college_profile(pl, shown) where id = pid;
    n := n + 1;
  end loop;
  return n;
end $function$;

-- The class generator, unchanged except the last step: hide the gems in a full class.
create or replace function public.generate_draft_class(p_season integer, p_count integer, p_position text default null) returns integer language plpgsql security definer set search_path to '' as $function$
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
      age := 22;
      pot := public.kicker_potential(true);
      stars := public.kicker_rookie_stars(pot);
    else
      pot := case when p_season >= coalesce(public.setting_int('elite_rules_from_season'), 999)
        then (array[2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4])[1 + floor(random() * 17)::int]
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
  if p_position is null then perform public.hide_draft_gems(p_season); end if;
  return made;
end $function$;

-- Bots read the board: their idea of a prospect's ceiling comes from his college grade. A talent scout splits the
-- difference with the real number (his scouts are better), everyone else goes by the board.
create or replace function public.draft_bot_choice(p_team text, p_season integer) returns text language plpgsql security definer set search_path to '' as $function$
declare sit jsonb := public.bot_situation(p_team); md text; yw numeric; noise numeric; trust numeric;
begin
  md := sit->>'mode';
  yw := case md when 'rebuild' then 0.55 when 'win_now' then 0.2 else 0.35 end;
  trust := 0;
  if sit #>> '{brain,archetype}' = 'talent_scout' then yw := yw + 0.15; trust := 0.5; end if;
  noise := case sit #>> '{brain,archetype}' when 'gunslinger' then 0.45 when 'caretaker' then 0.1 else 0.25 end;
  return (select pr.id from public.players pr left join public.player_potential pp on pp.player_id = pr.id
    where pr.status = 'prospect' and pr.draft_season = p_season
      and not exists (select 1 from public.draft_selections s where s.player_id = pr.id and s.status <> 'denied')
    order by (coalesce(pr.stars, 2) + greatest(0, (1 - trust) * coalesce(1 + 4 * (pr.college_stats->>'grade')::numeric / 100, pp.potential, pr.stars)
               + trust * coalesce(pp.potential, pr.stars) - pr.stars) * yw)
             * least(1.35, public.bot_fit(p_team, pr.position) * public.bot_future_fit(p_team, pr.position)) * public.position_weight(pr.position) + random() * noise desc
    limit 1);
end $function$;
