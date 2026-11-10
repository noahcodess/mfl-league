-- Weight changes over a career (never more than 30 lbs from where he started): strength growth adds weight, speed
-- growth trims it. DL is a regular defensive lineman (between a DE and a DT in size), not a nose tackle.

alter table public.players add column base_weight_lb int;
update public.players set base_weight_lb = weight_lb;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.body_base(text)'::regprocedure);
  execute replace(d, '(''DL'', 74.8, 325, 1.3, 12)', '(''DL'', 75.4, 292, 1.5, 15)');
  d := pg_get_functiondef('public.assign_body(text)'::regprocedure);
  execute replace(d, 'weight_lb = round(least(b.w + 40, greatest(b.w - 35, w))) where id = p_id;',
    'weight_lb = round(least(b.w + 40, greatest(b.w - 35, w))) where id = p_id;
  update public.players set base_weight_lb = weight_lb where id = p_id;');
end $$;

select public.assign_body(id) from public.players where position = 'DL' and status <> 'retired';

-- One offseason of growth, now with weight following the bars.
create or replace function public.develop_players() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; g numeric; new_stars numeric; share numeric; old jsonb; out jsonb; k text; v int; made int := 0;
  power_gain numeric; speed_gain numeric; dw numeric;
begin
  for r in select p.*, pp.potential as pot, pp.ceilings from public.players p join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and pp.potential > p.stars and p.age <= 26 loop
    g := case
      when r.age <= 22 then (array[0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5])[1 + floor(random() * 10)::int]
      when r.age <= 24 then (array[0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1])[1 + floor(random() * 10)::int]
      else (array[0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5])[1 + floor(random() * 10)::int] end;
    new_stars := least(r.pot, r.stars + g);
    continue when new_stars <= r.stars;
    share := (new_stars - r.stars) / (r.pot - r.stars);
    select ratings into old from public.player_attributes where player_id = r.id;
    out := '{}';
    for k, v in select key, value::int from jsonb_each_text(old) loop
      out := out || jsonb_build_object(k, least(99, v + greatest(0, round((coalesce((r.ceilings->>k)::int, v) - v) * share))));
    end loop;
    update public.player_attributes set ratings = out, updated_at = now() where player_id = r.id;
    -- Weight follows the work: power bars up = a few pounds on, speed up = a few off. Capped at 30 from his start.
    select coalesce(avg((out->>key)::numeric - (old->>key)::numeric), 0) into power_gain
      from unnest(array['strength', 'anchor', 'power_moves', 'break_tackle', 'hit_power', 'run_block', 'run_stop']) key where old ? key;
    speed_gain := coalesce((out->>'speed')::numeric - (old->>'speed')::numeric, 0);
    dw := power_gain * 0.8 - speed_gain * 1.0 + (random() * 4 - 1);
    update public.players set stars = new_stars,
      weight_lb = least(coalesce(base_weight_lb, weight_lb) + 30, greatest(coalesce(base_weight_lb, weight_lb) - 30, weight_lb + round(dw)))
      where id = r.id;
    if new_stars - r.stars >= 1 then
      perform public.log_event('developed', r.id, r.team_id, format('%s made a big jump: %s to %s stars', r.name, r.stars, new_stars));
    end if;
    made := made + 1;
  end loop;
  return made;
end $$;

-- Snapshots keep weight too.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.take_snapshot(text)'::regprocedure);
  execute replace(d, '''stars'', stars)', '''stars'', stars, ''weight_lb'', weight_lb)');
  d := pg_get_functiondef('public.undo_last_step()'::regprocedure);
  execute replace(d, 'stars = case when x ? ''stars'' then (x->>''stars'')::numeric else p.stars end',
    'stars = case when x ? ''stars'' then (x->>''stars'')::numeric else p.stars end,
    weight_lb = case when x ? ''weight_lb'' then (x->>''weight_lb'')::int else p.weight_lb end');
end $$;

revoke execute on function public.develop_players() from public, anon, authenticated;
