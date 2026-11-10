-- Ratings audit, ceilings and progression.
-- 1. Every player's position bars are re-centered on his star level (Speed and Toughness left alone).
-- 2. Speed and Toughness barely grow: their ceilings sit just above the rating (rookies arrive near max speed).
-- 3. Progression: at Birthday & Farewell, young players with room to grow may gain stars (+0.5 usually, a rare +1),
--    and every bar rises evenly toward its ceiling by the same share. Snapshots now keep stars and bars for undo.

with d as (
  select a.player_id, round(avg(e.value::numeric) filter (where e.key not in ('speed', 'toughness'))
    - (public.rating_target(p.stars) + case when p.elite then 2 else 0 end))::int as diff
  from public.player_attributes a join public.players p on p.id = a.player_id cross join lateral jsonb_each_text(a.ratings) e
  where p.name not in ('Bojan Kovacic', 'Garry Drake')
  group by a.player_id, p.stars, p.elite)
update public.player_attributes a set ratings = (
  select jsonb_object_agg(e.key, case when e.key in ('speed', 'toughness') then e.value::int else least(99, greatest(25, e.value::int - d.diff)) end)
  from jsonb_each_text(a.ratings) e)
from d where d.player_id = a.player_id and abs(d.diff) >= 2;

create or replace function public.refresh_ceilings(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.players; pot numeric; r jsonb; gap numeric; k text; v int; out jsonb := '{}';
begin
  select * into p from public.players where id = p_id;
  select potential into pot from public.player_potential where player_id = p_id;
  select ratings into r from public.player_attributes where player_id = p_id;
  if r is null or pot is null then return; end if;
  gap := public.rating_target(greatest(pot, p.stars)) - public.rating_target(p.stars);
  for k, v in select key, value::int from jsonb_each_text(r) loop
    out := out || jsonb_build_object(k, least(99, greatest(v, round(case
      when k in ('speed', 'toughness') then v + least(gap, 4) * random() -- you're about as fast and tough as you'll ever be
      else v + gap * (0.6 + random() * 0.8) end))));
  end loop;
  update public.player_potential set ceilings = out where player_id = p_id;
end $$;

select public.refresh_ceilings(player_id) from public.player_attributes;

-- One offseason of growth. Returns how many players improved.
create or replace function public.develop_players() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; g numeric; new_stars numeric; share numeric; ceil jsonb; out jsonb; k text; v int; made int := 0;
begin
  for r in select p.*, pp.potential as pot, pp.ceilings from public.players p join public.player_potential pp on pp.player_id = p.id
           where p.status <> 'retired' and pp.potential > p.stars and p.age <= 26 loop
    g := case
      when r.age <= 22 then (array[0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5])[1 + floor(random() * 10)::int]
      when r.age <= 24 then (array[0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1])[1 + floor(random() * 10)::int]
      else (array[0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5])[1 + floor(random() * 10)::int] end;
    new_stars := least(r.pot, r.stars + g);
    continue when new_stars <= r.stars;
    share := (new_stars - r.stars) / (r.pot - r.stars); -- the same share of the way up for every bar
    out := '{}';
    for k, v in select key, value::int from jsonb_each_text((select ratings from public.player_attributes where player_id = r.id)) loop
      out := out || jsonb_build_object(k, least(99, v + greatest(0, round((coalesce((r.ceilings->>k)::int, v) - v) * share))));
    end loop;
    update public.player_attributes set ratings = out, updated_at = now() where player_id = r.id;
    update public.players set stars = new_stars where id = r.id;
    if new_stars - r.stars >= 1 then
      perform public.log_event('developed', r.id, r.team_id, format('%s made a big jump: %s to %s stars', r.name, r.stars, new_stars));
    end if;
    made := made + 1;
  end loop;
  return made;
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  execute replace(d, 'format(''Birthday & Farewell: %s players turned a year older'', n), jsonb_build_object(''players'', n));',
    'format(''Birthday & Farewell: %s players turned a year older'', n), jsonb_build_object(''players'', n));
    perform public.log_event(''developed'', null, null, format(''%s young players improved this offseason'', public.develop_players()));');
end $$;

-- Snapshots keep stars and bars too, so undoing Birthday & Farewell also undoes growth.
alter table public.league_snapshots add column attributes jsonb not null default '[]';

create or replace function public.take_snapshot(p_label text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid bigint;
begin
  insert into public.league_snapshots (label, settings, players, contracts, negotiations, fa_offers, attributes, last_event_id, created_by)
  values (p_label,
    (select jsonb_object_agg(key, value) from public.league_settings),
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'age', age, 'team_id', team_id, 'status', status, 'depth', depth, 'slot', slot,
       'number', number, 'previous_team_id', previous_team_id, 'stars', stars)), '[]') from public.players),
    (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.contracts c),
    (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.negotiations g),
    (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.fa_offers o),
    (select coalesce(jsonb_agg(jsonb_build_object('player_id', player_id, 'ratings', ratings)), '[]') from public.player_attributes),
    coalesce((select max(id) from public.league_events), 0), auth.uid())
  returning id into sid;
  delete from public.league_snapshots where id not in (select id from public.league_snapshots order by id desc limit 20);
  return sid;
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.undo_last_step()'::regprocedure);
  d := replace(d, 'previous_team_id = case when x ? ''previous_team_id'' then x->>''previous_team_id'' else p.previous_team_id end',
    'previous_team_id = case when x ? ''previous_team_id'' then x->>''previous_team_id'' else p.previous_team_id end,
    stars = case when x ? ''stars'' then (x->>''stars'')::numeric else p.stars end');
  execute replace(d, '  delete from public.contracts where true;',
    '  update public.player_attributes a set ratings = x->''ratings'' from jsonb_array_elements(s.attributes) x where a.player_id = x->>''player_id'';
  delete from public.contracts where true;');
end $$;

revoke execute on function public.develop_players(), public.take_snapshot(text) from public, anon, authenticated;
