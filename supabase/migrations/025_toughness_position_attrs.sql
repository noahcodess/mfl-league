-- Attributes, round 3: every position has 10 bars: 8 for his position plus Speed and Toughness
-- (Toughness = stamina plus how often he gets hurt; it replaces Stamina, and Clutch is gone).
-- New position bars include QB Throw Under Pressure and Play Action, WR Run After Catch and Spectacular Catch.
-- 10 speed gets rarer (at most 10 players), and Garry Drake gets a new look. No deletes: rows are renamed in place.

update public.attribute_defs set key = 'toughness', label = 'Toughness' where key = 'stamina';
update public.attribute_defs set key = case position when 'QB' then 'throw_pressure' when 'RB' then 'pass_block' when 'WR' then 'run_after_catch'
    when 'TE' then 'run_after_catch' when 'OT' then 'discipline' when 'OG' then 'discipline' when 'C' then 'anchor'
    when 'DL' then 'double_team' when 'DT' then 'double_team' when 'DE' then 'run_stop' when 'LB' then 'blitzing'
    when 'CB' then 'jumping' else 'pursuit' end where key = 'clutch';
insert into public.attribute_defs (position, ord, key, label) values
('QB', 1, 'throw_power', 'Throw Power'),
('QB', 2, 'short_acc', 'Short Accuracy'),
('QB', 3, 'deep_acc', 'Deep Accuracy'),
('QB', 4, 'throw_on_run', 'Throw on the Run'),
('QB', 5, 'vision', 'Reading Defenses'),
('QB', 6, 'break_sack', 'Break Sack'),
('QB', 7, 'throw_pressure', 'Throw Under Pressure'),
('QB', 8, 'play_action', 'Play Action'),
('QB', 9, 'speed', 'Speed'),
('QB', 10, 'toughness', 'Toughness'),
('RB', 1, 'acceleration', 'Acceleration'),
('RB', 2, 'elusiveness', 'Elusiveness'),
('RB', 3, 'break_tackle', 'Break Tackle'),
('RB', 4, 'carrying', 'Ball Security'),
('RB', 5, 'vision', 'Vision'),
('RB', 6, 'catching', 'Catching'),
('RB', 7, 'pass_block', 'Pass Block'),
('RB', 8, 'route_running', 'Route Running'),
('RB', 9, 'speed', 'Speed'),
('RB', 10, 'toughness', 'Toughness'),
('WR', 1, 'catching', 'Catching'),
('WR', 2, 'route_running', 'Route Running'),
('WR', 3, 'release', 'Release'),
('WR', 4, 'catch_traffic', 'Catch in Traffic'),
('WR', 5, 'jumping', 'Jumping'),
('WR', 6, 'agility', 'Agility'),
('WR', 7, 'run_after_catch', 'Run After Catch'),
('WR', 8, 'spectacular_catch', 'Spectacular Catch'),
('WR', 9, 'speed', 'Speed'),
('WR', 10, 'toughness', 'Toughness'),
('TE', 1, 'catching', 'Catching'),
('TE', 2, 'route_running', 'Route Running'),
('TE', 3, 'catch_traffic', 'Catch in Traffic'),
('TE', 4, 'run_block', 'Run Block'),
('TE', 5, 'pass_block', 'Pass Block'),
('TE', 6, 'strength', 'Strength'),
('TE', 7, 'run_after_catch', 'Run After Catch'),
('TE', 8, 'release', 'Release'),
('TE', 9, 'speed', 'Speed'),
('TE', 10, 'toughness', 'Toughness'),
('OT', 1, 'pass_block', 'Pass Block'),
('OT', 2, 'run_block', 'Run Block'),
('OT', 3, 'strength', 'Strength'),
('OT', 4, 'footwork', 'Footwork'),
('OT', 5, 'anchor', 'Anchor'),
('OT', 6, 'awareness', 'Awareness'),
('OT', 7, 'discipline', 'Discipline'),
('OT', 8, 'agility', 'Agility'),
('OT', 9, 'speed', 'Speed'),
('OT', 10, 'toughness', 'Toughness'),
('OG', 1, 'pass_block', 'Pass Block'),
('OG', 2, 'run_block', 'Run Block'),
('OG', 3, 'strength', 'Strength'),
('OG', 4, 'footwork', 'Footwork'),
('OG', 5, 'anchor', 'Anchor'),
('OG', 6, 'awareness', 'Awareness'),
('OG', 7, 'discipline', 'Discipline'),
('OG', 8, 'agility', 'Agility'),
('OG', 9, 'speed', 'Speed'),
('OG', 10, 'toughness', 'Toughness'),
('C', 1, 'pass_block', 'Pass Block'),
('C', 2, 'run_block', 'Run Block'),
('C', 3, 'strength', 'Strength'),
('C', 4, 'footwork', 'Footwork'),
('C', 5, 'anchor', 'Anchor'),
('C', 6, 'awareness', 'Awareness'),
('C', 7, 'snapping', 'Snapping'),
('C', 8, 'discipline', 'Discipline'),
('C', 9, 'speed', 'Speed'),
('C', 10, 'toughness', 'Toughness'),
('DL', 1, 'power_moves', 'Power Moves'),
('DL', 2, 'finesse_moves', 'Finesse Moves'),
('DL', 3, 'block_shed', 'Block Shedding'),
('DL', 4, 'strength', 'Strength'),
('DL', 5, 'run_stop', 'Run Stopping'),
('DL', 6, 'pursuit', 'Pursuit'),
('DL', 7, 'double_team', 'Beats Double Teams'),
('DL', 8, 'tackling', 'Tackling'),
('DL', 9, 'speed', 'Speed'),
('DL', 10, 'toughness', 'Toughness'),
('DT', 1, 'power_moves', 'Power Moves'),
('DT', 2, 'finesse_moves', 'Finesse Moves'),
('DT', 3, 'block_shed', 'Block Shedding'),
('DT', 4, 'strength', 'Strength'),
('DT', 5, 'run_stop', 'Run Stopping'),
('DT', 6, 'pursuit', 'Pursuit'),
('DT', 7, 'double_team', 'Beats Double Teams'),
('DT', 8, 'tackling', 'Tackling'),
('DT', 9, 'speed', 'Speed'),
('DT', 10, 'toughness', 'Toughness'),
('DE', 1, 'speed_rush', 'Speed Rush'),
('DE', 2, 'power_moves', 'Power Moves'),
('DE', 3, 'block_shed', 'Block Shedding'),
('DE', 4, 'strength', 'Strength'),
('DE', 5, 'pursuit', 'Pursuit'),
('DE', 6, 'tackling', 'Tackling'),
('DE', 7, 'run_stop', 'Run Stopping'),
('DE', 8, 'finesse_moves', 'Finesse Moves'),
('DE', 9, 'speed', 'Speed'),
('DE', 10, 'toughness', 'Toughness'),
('LB', 1, 'tackling', 'Tackling'),
('LB', 2, 'pursuit', 'Pursuit'),
('LB', 3, 'play_rec', 'Play Recognition'),
('LB', 4, 'hit_power', 'Hit Power'),
('LB', 5, 'zone_cover', 'Zone Coverage'),
('LB', 6, 'man_cover', 'Man Coverage'),
('LB', 7, 'blitzing', 'Blitzing'),
('LB', 8, 'block_shed', 'Block Shedding'),
('LB', 9, 'speed', 'Speed'),
('LB', 10, 'toughness', 'Toughness'),
('CB', 1, 'man_cover', 'Man Coverage'),
('CB', 2, 'zone_cover', 'Zone Coverage'),
('CB', 3, 'press', 'Press'),
('CB', 4, 'ball_skills', 'Ball Skills'),
('CB', 5, 'agility', 'Agility'),
('CB', 6, 'tackling', 'Tackling'),
('CB', 7, 'jumping', 'Jumping'),
('CB', 8, 'play_rec', 'Play Recognition'),
('CB', 9, 'speed', 'Speed'),
('CB', 10, 'toughness', 'Toughness'),
('SS', 1, 'zone_cover', 'Zone Coverage'),
('SS', 2, 'man_cover', 'Man Coverage'),
('SS', 3, 'tackling', 'Tackling'),
('SS', 4, 'hit_power', 'Hit Power'),
('SS', 5, 'ball_skills', 'Ball Skills'),
('SS', 6, 'play_rec', 'Play Recognition'),
('SS', 7, 'pursuit', 'Pursuit'),
('SS', 8, 'blitzing', 'Blitzing'),
('SS', 9, 'speed', 'Speed'),
('SS', 10, 'toughness', 'Toughness')
on conflict (position, key) do update set ord = excluded.ord, label = excluded.label;

-- Every player's bars now match his position's list exactly: keep what he has, Stamina carries over as Toughness,
-- brand-new bars are rolled around his star level, and Clutch drops off.
update public.player_attributes a set ratings = (
  select jsonb_object_agg(d.key, coalesce((a.ratings->>d.key)::int,
    case when d.key = 'toughness' then coalesce((a.ratings->>'stamina')::int, 70)
         else least(99, greatest(25, round(public.rating_target(p.stars) + (random() + random() + random() - 1.5) * 16)))::int end))
  from public.attribute_defs d where d.position = p.position)
from public.players p where p.id = a.player_id;

-- At most 10 players with 10 speed (98+): Garry and the fastest others keep it, the rest top out at a 9.
update public.player_attributes set ratings = ratings || '{"speed": 96}'
where (ratings->>'speed')::int >= 98 and player_id not in (
  select player_id from public.player_attributes where (ratings->>'speed')::int >= 98
  order by (player_id = (select id from public.players where name = 'Garry Drake')) desc, (ratings->>'speed')::int desc, random() limit 10);

update public.player_attributes set ratings = ratings || '{"throw_pressure": 89, "play_action": 82}' where player_id = (select id from public.players where name = 'Bojan Kovacic');
update public.player_attributes set ratings = ratings || '{"run_after_catch": 84, "spectacular_catch": 91}' where player_id = (select id from public.players where name = 'Garry Drake');

-- Garry Drake: curly hair, a slightly darker skin tone, clean-cut and smiling.
update public.players set looks = looks || '{"style": "curly", "skin": "#e9b994", "mouth": "smile", "nose": "normal", "brows": "normal", "eyeShape": "normal", "headband": false, "beard": "none"}'
  where name = 'Garry Drake';

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_attributes(text)'::regprocedure);
  d := replace(d, 'when keys[i] = ''clutch'' then 45 + random() * 50 + (target - 67) * 0.1
      ', '');
  d := replace(d, 'when keys[i] = ''stamina'' then', 'when keys[i] = ''toughness'' then');
  execute replace(d, 'when keys[i] = ''speed'' then target + raw[i] - shift + public.speed_offset(p.position)',
                     'when keys[i] = ''speed'' then least(97, target + raw[i] - shift + public.speed_offset(p.position))');
  d := pg_get_functiondef('public.apply_style(text,text)'::regprocedure);
  execute replace(d, '(''stamina'', ''clutch'')', '(''toughness'')');
end $$;

create or replace view public.player_ranks with (security_invoker = true) as
select p.id as player_id, x.ovr,
  rank() over (partition by p.position order by x.ovr desc) as pos_rank,
  rank() over (order by x.ovr desc) as overall_rank
from public.players p
join public.player_attributes a on a.player_id = p.id
cross join lateral (
  select round(avg(e.value::numeric) filter (where e.key not in ('speed', 'toughness'))
    * (case when p.position in ('RB', 'WR', 'CB', 'SS') then 0.85 else 1 end)
    + (case when p.position in ('RB', 'WR', 'CB', 'SS') then (a.ratings->>'speed')::numeric * 0.15 else 0 end))::int as ovr
  from jsonb_each_text(a.ratings) e) x
where p.status <> 'retired';

select public.refresh_ceilings(player_id) from public.player_attributes;
