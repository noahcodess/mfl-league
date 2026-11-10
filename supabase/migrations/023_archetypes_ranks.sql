-- Archetypes and ranks.
-- Toughness is gone (Stamina covers tiredness and injuries); everyone gets Clutch instead: close games, playoffs, the Craft Bowl.
-- Each player gets an archetype for his position that pushes some bars up and others down (his average stays the same).
-- OVR = his skill rating from his position bars (speed counts a little for RB, WR, CB, SS), ranked by position and overall.

update public.attribute_defs set key = 'clutch', label = 'Clutch' where key = 'toughness';
update public.player_attributes set ratings = (ratings - 'toughness') || jsonb_build_object('clutch', round(45 + random() * 50)::int);

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_attributes(text)'::regprocedure);
  execute replace(d, 'when keys[i] = ''toughness'' then 50 + random() * 45 + (target - 67) * 0.15',
                     'when keys[i] = ''clutch'' then 45 + random() * 50 + (target - 67) * 0.1');
end $$;

create table public.style_defs (position text not null, style text not null, label text not null, boosts text[] not null, drops text[] not null,
  primary key (position, style));
alter table public.style_defs enable row level security;
create policy "anyone reads archetypes" on public.style_defs for select to anon, authenticated using (true);
alter table public.player_attributes add column style text;

create or replace function public.apply_style(p_id text, p_style text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.players; r jsonb; st public.style_defs; k text; v numeric; old_mean numeric; new_mean numeric; out jsonb := '{}'; tmp jsonb := '{}';
begin
  select * into p from public.players where id = p_id;
  select ratings into r from public.player_attributes where player_id = p_id;
  if r is null then return; end if;
  select * into st from public.style_defs where position = p.position and (p_style is null or style = p_style) order by random() limit 1;
  if st.style is null then return; end if;
  select avg(value::numeric) into old_mean from jsonb_each_text(r) where key not in ('stamina', 'clutch');
  for k, v in select key, value::numeric from jsonb_each_text(r) loop
    tmp := tmp || jsonb_build_object(k, v + case when k = any(st.boosts) then 7 + random() * 5 when k = any(st.drops) then -(7 + random() * 5) else 0 end);
  end loop;
  select avg(value::numeric) into new_mean from jsonb_each_text(tmp) where key not in ('stamina', 'clutch');
  for k, v in select key, value::numeric from jsonb_each_text(tmp) loop
    out := out || jsonb_build_object(k, least(99, greatest(25, round(v - case when k in ('stamina', 'clutch') then 0 else new_mean - old_mean end)))::int);
  end loop;
  update public.player_attributes set ratings = out, style = st.style, updated_at = now() where player_id = p_id;
  perform public.refresh_ceilings(p_id);
end $$;

create or replace function public.players_make_attributes() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.generate_attributes(new.id); perform public.apply_style(new.id); return new; end $$;

create or replace view public.player_ranks with (security_invoker = true) as
select p.id as player_id, x.ovr,
  rank() over (partition by p.position order by x.ovr desc) as pos_rank,
  rank() over (order by x.ovr desc) as overall_rank
from public.players p
join public.player_attributes a on a.player_id = p.id
cross join lateral (
  select round(avg(e.value::numeric) filter (where e.key not in ('speed', 'stamina', 'clutch'))
    * (case when p.position in ('RB', 'WR', 'CB', 'SS') then 0.85 else 1 end)
    + (case when p.position in ('RB', 'WR', 'CB', 'SS') then (a.ratings->>'speed')::numeric * 0.15 else 0 end))::int as ovr
  from jsonb_each_text(a.ratings) e) x
where p.status <> 'retired';
grant select on public.player_ranks to anon, authenticated;

revoke execute on function public.apply_style(text, text) from public, anon, authenticated;

insert into public.style_defs (position, style, label, boosts, drops) values
('QB', 'gunslinger', 'Gunslinger', '{throw_power,deep_acc}', '{short_acc,vision}'),
('QB', 'scrambler', 'Scrambler', '{speed,throw_on_run,break_sack}', '{vision}'),
('QB', 'field_general', 'Field General', '{vision,short_acc}', '{speed,throw_power}'),
('QB', 'pocket_passer', 'Pocket Passer', '{short_acc,deep_acc}', '{speed,throw_on_run}'),
('RB', 'speed_back', 'Speed Back', '{speed,acceleration}', '{break_tackle}'),
('RB', 'power_back', 'Power Back', '{break_tackle,carrying}', '{elusiveness,speed}'),
('RB', 'elusive_back', 'Elusive Back', '{elusiveness,vision}', '{break_tackle}'),
('RB', 'receiving_back', 'Receiving Back', '{catching,elusiveness}', '{break_tackle,carrying}'),
('WR', 'deep_threat', 'Deep Threat', '{speed,release}', '{catch_traffic}'),
('WR', 'possession', 'Possession Receiver', '{catching,catch_traffic,route_running}', '{speed}'),
('WR', 'route_tech', 'Route Technician', '{route_running,release,agility}', '{jumping}'),
('WR', 'red_zone', 'Red Zone Target', '{jumping,catch_traffic}', '{speed,agility}'),
('TE', 'receiving_te', 'Receiving Tight End', '{catching,route_running}', '{run_block,pass_block}'),
('TE', 'blocking_te', 'Blocking Tight End', '{run_block,pass_block,strength}', '{route_running,speed}'),
('TE', 'hybrid_te', 'Hybrid Tight End', '{catch_traffic,run_block}', '{}'),
('OT', 'pass_pro', 'Pass Protector', '{pass_block,footwork}', '{run_block}'),
('OT', 'road_grader', 'Road Grader', '{run_block,strength}', '{footwork,speed}'),
('OT', 'technician', 'Technician', '{awareness,footwork}', '{strength}'),
('OG', 'pass_pro', 'Pass Protector', '{pass_block,footwork}', '{run_block}'),
('OG', 'road_grader', 'Road Grader', '{run_block,strength}', '{footwork,speed}'),
('OG', 'technician', 'Technician', '{awareness,footwork}', '{strength}'),
('C', 'pass_pro', 'Pass Protector', '{pass_block,footwork}', '{run_block}'),
('C', 'road_grader', 'Road Grader', '{run_block,strength}', '{footwork,speed}'),
('C', 'anchor_man', 'Line Captain', '{awareness,snapping}', '{strength}'),
('DL', 'run_stuffer', 'Run Stuffer', '{run_stop,strength}', '{finesse_moves,speed}'),
('DL', 'power_rusher', 'Power Rusher', '{power_moves,strength}', '{finesse_moves}'),
('DL', 'quick_rusher', 'Quick Rusher', '{finesse_moves,speed}', '{run_stop,strength}'),
('DT', 'run_stuffer', 'Run Stuffer', '{run_stop,strength}', '{finesse_moves,speed}'),
('DT', 'power_rusher', 'Power Rusher', '{power_moves,strength}', '{finesse_moves}'),
('DT', 'quick_rusher', 'Quick Rusher', '{finesse_moves,speed}', '{run_stop,strength}'),
('DE', 'speed_rusher', 'Speed Rusher', '{speed_rush,speed}', '{strength}'),
('DE', 'power_rusher', 'Power Rusher', '{power_moves,strength}', '{speed}'),
('DE', 'edge_setter', 'Edge Setter', '{block_shed,tackling}', '{speed_rush}'),
('LB', 'thumper', 'Thumper', '{tackling,hit_power}', '{zone_cover,man_cover}'),
('LB', 'coverage_lb', 'Coverage Linebacker', '{zone_cover,man_cover,speed}', '{hit_power}'),
('LB', 'field_general', 'Field General', '{play_rec,pursuit}', '{man_cover}'),
('CB', 'lockdown', 'Lockdown Corner', '{man_cover,press}', '{zone_cover}'),
('CB', 'zone_hawk', 'Zone Hawk', '{zone_cover,ball_skills}', '{press}'),
('CB', 'slot', 'Slot Corner', '{agility,man_cover}', '{press,tackling}'),
('CB', 'physical', 'Physical Corner', '{press,tackling}', '{speed}'),
('SS', 'box_safety', 'Box Safety', '{tackling,hit_power}', '{man_cover}'),
('SS', 'ball_hawk', 'Ball Hawk', '{ball_skills,zone_cover}', '{hit_power}'),
('SS', 'center_fielder', 'Center Fielder', '{zone_cover,speed,play_rec}', '{tackling}');

select public.apply_style(player_id) from public.player_attributes;

-- Signature players, hand-tuned (averages kept where they were).
-- Bojan Kovacic: big arm, makes off-platform throws on the move, escapes pressure; forces it and locks on at times.
update public.player_attributes set style = 'scrambler', ratings = '{"throw_power": 90, "short_acc": 66, "deep_acc": 77, "throw_on_run": 91, "vision": 71, "break_sack": 86, "speed": 76, "stamina": 83, "clutch": 88}'
  where player_id = (select id from public.players where name = 'Bojan Kovacic');
-- Garry Drake: big-bodied contested-catch receiver who also has real speed.
update public.player_attributes set style = 'red_zone', ratings = '{"catching": 84, "route_running": 74, "release": 73, "catch_traffic": 92, "jumping": 88, "agility": 68, "speed": 91, "stamina": 78, "clutch": 80}'
  where player_id = (select id from public.players where name = 'Garry Drake');
select public.refresh_ceilings(id) from public.players where name in ('Bojan Kovacic', 'Garry Drake');
