-- Height and weight for every player, from real NFL averages by position (ESPN NFL census, 2023 league averages),
-- then nudged by his bars: tall receivers win contested catches and jump balls, shorter ones run sharper routes and
-- are shiftier; strong linemen and big hitters carry more weight; fast players carry less.
-- In this league DL is the nose tackle spot (bigger than a DT).

alter table public.players add column height_in int, add column weight_lb int;

-- Typical size by position: average height (inches) and weight (lbs), and how much players vary.
create or replace function public.body_base(p_position text, out h numeric, out w numeric, out h_sd numeric, out w_sd numeric)
language sql immutable set search_path = '' as $$
  select * from (values
    ('QB', 75.0, 222, 1.5, 9), ('RB', 70.8, 214, 1.6, 11), ('WR', 72.6, 200, 2.0, 11), ('TE', 76.6, 250, 1.2, 9),
    ('OT', 77.8, 316, 1.1, 9), ('OG', 76.2, 314, 1.1, 9), ('C', 75.4, 305, 1.0, 8), ('DL', 74.8, 325, 1.3, 12),
    ('DT', 75.0, 308, 1.3, 11), ('DE', 76.0, 270, 1.4, 11), ('LB', 74.2, 238, 1.3, 9), ('CB', 71.8, 194, 1.6, 8),
    ('SS', 72.4, 206, 1.4, 8)) v(pos, bh, bw, hs, ws)
  where pos = p_position
$$;

create or replace function public.assign_body(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.players; r jsonb; b record; tilt_h numeric := 0; tilt_w numeric := 0; h numeric; w numeric;
begin
  select * into p from public.players where id = p_id;
  select ratings into r from public.player_attributes where player_id = p_id;
  select * into b from public.body_base(p.position);
  if b.h is null or r is null then return; end if;
  -- How his bars pull his size (each point of difference between two bars ~ a tiny nudge).
  tilt_h := case p.position
    when 'WR' then ((r->>'catch_traffic')::numeric + (r->>'jumping')::numeric - (r->>'route_running')::numeric - (r->>'agility')::numeric) / 2
    when 'CB' then ((r->>'jumping')::numeric + (r->>'press')::numeric - (r->>'agility')::numeric * 2) / 2
    when 'SS' then ((r->>'hit_power')::numeric - (r->>'man_cover')::numeric)
    when 'QB' then ((r->>'throw_power')::numeric + (r->>'vision')::numeric - (r->>'speed')::numeric - (r->>'throw_on_run')::numeric) / 2
    when 'RB' then ((r->>'break_tackle')::numeric - (r->>'elusiveness')::numeric)
    when 'TE' then ((r->>'catch_traffic')::numeric - (r->>'run_after_catch')::numeric)
    when 'OT' then ((r->>'pass_block')::numeric - (r->>'run_block')::numeric)
    when 'DE' then ((r->>'power_moves')::numeric - (r->>'speed_rush')::numeric)
    else 0 end;
  tilt_w := case p.position
    when 'RB' then ((r->>'break_tackle')::numeric - (r->>'elusiveness')::numeric - ((r->>'speed')::numeric - 70)) / 2
    when 'TE' then ((r->>'run_block')::numeric + (r->>'pass_block')::numeric - (r->>'route_running')::numeric - (r->>'speed')::numeric) / 2
    when 'OT' then ((r->>'strength')::numeric + (r->>'anchor')::numeric - (r->>'footwork')::numeric - (r->>'agility')::numeric) / 2
    when 'OG' then ((r->>'strength')::numeric + (r->>'anchor')::numeric - (r->>'footwork')::numeric - (r->>'agility')::numeric) / 2
    when 'C' then ((r->>'strength')::numeric + (r->>'anchor')::numeric - (r->>'footwork')::numeric - (r->>'speed')::numeric) / 2
    when 'DL' then ((r->>'strength')::numeric + (r->>'run_stop')::numeric - (r->>'finesse_moves')::numeric - (r->>'speed')::numeric) / 2
    when 'DT' then ((r->>'strength')::numeric + (r->>'run_stop')::numeric - (r->>'finesse_moves')::numeric - (r->>'speed')::numeric) / 2
    when 'DE' then ((r->>'power_moves')::numeric + (r->>'strength')::numeric - (r->>'speed_rush')::numeric - (r->>'speed')::numeric) / 2
    when 'LB' then ((r->>'hit_power')::numeric + (r->>'block_shed')::numeric - (r->>'zone_cover')::numeric - (r->>'man_cover')::numeric) / 2
    when 'SS' then ((r->>'hit_power')::numeric - (r->>'zone_cover')::numeric)
    else -((r->>'speed')::numeric - 70) / 2 end;
  h := b.h + tilt_h * 0.06 + (random() + random() + random() - 1.5) * b.h_sd;
  w := b.w + (h - b.h) * (case when p.position in ('OT', 'OG', 'C', 'DL', 'DT') then 4 else 5 end) + tilt_w * 0.35
       + (random() + random() + random() - 1.5) * b.w_sd;
  update public.players set height_in = round(least(b.h + 4.5, greatest(b.h - 4.5, h))),
    weight_lb = round(least(b.w + 40, greatest(b.w - 35, w))) where id = p_id;
end $$;

create or replace function public.players_make_attributes() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.generate_attributes(new.id); perform public.apply_style(new.id); perform public.assign_body(new.id);
  return new;
end $$;

select public.assign_body(id) from public.players where status <> 'retired';

-- Signature players: Bojan 6'2" 225, Garry Drake 6'4" 212 (long, lean and fast).
update public.players set height_in = 74, weight_lb = 225 where name = 'Bojan Kovacic';
update public.players set height_in = 76, weight_lb = 212 where name = 'Garry Drake';

revoke execute on function public.body_base(text), public.assign_body(text) from public, anon, authenticated;
