-- 046: bot coach brains. Personality, situation read, player/pick values, trade judging, smarter drafting.

alter table public.coaches add column if not exists brain jsonb;
alter table public.trades add column if not exists bot_decide_at timestamptz, add column if not exists bot_verdict jsonb;

insert into public.league_settings (key, value) values
  ('bot_reply_min_seconds', '90'), ('bot_reply_max_seconds', '360'), ('bot_trade_edge', '1.08')
on conflict (key) do nothing;

-- A personality for one team's coach, leaning on the team's style. Reserved teams get a caretaker.
create or replace function public.make_bot_brain(p_team text) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare t public.teams; archs text[]; arch text; v jsonb; j int;
begin
  select * into t from public.teams where id = p_team;
  if t.reserved then
    return jsonb_build_object('archetype', 'caretaker', 'aggression', 1, 'patience', 3, 'loyalty', 3,
      'values', jsonb_build_object('picks', 50, 'youth', 50, 'stars', 50, 'cap', 50));
  end if;
  archs := case t.gm_style
    when 'contender' then '{gunslinger,gunslinger,steady,old_school,moneyball}'::text[]
    when 'rebuilding' then '{architect,architect,moneyball,steady,gunslinger}'::text[]
    else '{steady,moneyball,architect,old_school,gunslinger}'::text[] end;
  arch := archs[1 + floor(random() * 5)::int];
  v := case arch
    when 'gunslinger' then '{"aggression":5,"patience":1,"loyalty":2,"values":{"picks":25,"youth":30,"stars":90,"cap":25}}'
    when 'architect'  then '{"aggression":2,"patience":5,"loyalty":3,"values":{"picks":90,"youth":85,"stars":40,"cap":55}}'
    when 'old_school' then '{"aggression":1,"patience":3,"loyalty":5,"values":{"picks":40,"youth":35,"stars":70,"cap":40}}'
    when 'moneyball'  then '{"aggression":3,"patience":4,"loyalty":2,"values":{"picks":65,"youth":60,"stars":45,"cap":90}}'
    else                   '{"aggression":3,"patience":3,"loyalty":3,"values":{"picks":55,"youth":55,"stars":60,"cap":55}}' end::jsonb;
  -- a little wiggle so two coaches of the same type aren't clones
  for j in 1..4 loop
    v := jsonb_set(v, array['values', (array['picks','youth','stars','cap'])[j]],
      to_jsonb(greatest(5, least(98, (v #>> array['values', (array['picks','youth','stars','cap'])[j]])::int + floor(random() * 17)::int - 8))));
  end loop;
  return v || jsonb_build_object('archetype', arch);
end $$;

create or replace function public.bot_brain(p_team text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce((select brain from public.coaches where team_id = p_team),
    '{"archetype":"steady","aggression":3,"patience":3,"loyalty":3,"values":{"picks":55,"youth":55,"stars":60,"cap":55}}'::jsonb)
$$;

-- Starter quality: average stars of the starting lineup (an empty slot counts as 1.5).
create or replace function public.team_strength(p_team text) returns numeric
language sql stable security definer set search_path to '' as $$
  with r as (select p.position, p.stars, row_number() over (partition by p.position order by p.stars desc nulls last) rn
             from public.players p where p.team_id = p_team and p.status = 'active')
  select round(avg(coalesce(r.stars, 1.5)), 3)
  from public.roster_template t cross join generate_series(1, t.starters) g(n)
  left join r on r.position = t.position and r.rn = g.n
$$;

create or replace function public.team_strength_rank(p_team text) returns int
language sql stable security definer set search_path to '' as $$
  with s as (select id, public.team_strength(id) st from public.teams)
  select (1 + count(*) filter (where st > (select st from s where id = p_team)))::int from s
$$;

-- The first draft that hasn't happened yet.
create or replace function public.next_draft_season() returns int
language sql stable security definer set search_path to '' as $$
  select case when public.setting_int('offseason_step') <= 3
               and (select value #>> '{}' from public.league_settings where key = 'phase') = 'offseason'
               and not exists (select 1 from public.draft_room d where d.season = public.setting_int('current_season') and d.finished_at is not null)
    then public.setting_int('current_season') else public.setting_int('current_season') + 1 end
$$;

-- How badly a team wants a player at this spot: 0.85 (stacked) to 1.2 (big hole).
create or replace function public.bot_fit(p_team text, p_pos text) returns numeric
language sql stable security definer set search_path to '' as $$
  with r as (select p.stars, row_number() over (order by p.stars desc nulls last) rn
             from public.players p where p.team_id = p_team and p.status = 'active' and p.position = p_pos),
  t as (select coalesce((select starters from public.roster_template where position = p_pos), 1) n)
  select round(greatest(0.85, least(1.2, 1 + (3.6 - coalesce((select avg(coalesce(r.stars, 1.5))
    from t cross join generate_series(1, t.n) g(i) left join r on r.rn = g.i), 1.5)) * 0.15)), 3)
$$;

-- Everything a coach looks at before making a move.
create or replace function public.bot_situation(p_team text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare br jsonb := public.bot_brain(p_team); t public.teams; rk int; st numeric; score numeric; md text;
  old_core int; young_core int; expiring int; cap_room int; nd int := public.next_draft_season();
  firsts int; total_picks int; needs jsonb; cs int := public.setting_int('current_season');
begin
  select * into t from public.teams where id = p_team;
  st := public.team_strength(p_team); rk := public.team_strength_rank(p_team);
  select count(*) filter (where stars >= 4 and age >= 26), count(*) filter (where stars >= 3.5 and age <= 23)
    into old_core, young_core from public.players where team_id = p_team and status = 'active';
  select count(*) into expiring from public.contracts where team_id = p_team and status = 'active' and last_season <= cs;
  cap_room := public.setting_int('cap_limit') - public.team_cap_committed(p_team);
  select count(*) filter (where round = 1), count(*) into firsts, total_picks
    from public.picks where owner_id = p_team and season between nd and nd + 1;
  select coalesce(jsonb_agg(position order by f desc), '[]') into needs from (
    select position, public.bot_fit(p_team, position) f from public.roster_template order by 2 desc limit 3) x where f > 1.02;

  score := (8.5 - rk) / 7.5
    + case t.gm_style when 'contender' then 0.35 when 'rebuilding' then -0.35 else 0 end
    + case br->>'archetype' when 'gunslinger' then 0.25 when 'architect' then -0.25 else 0 end
    - case when old_core >= 5 and rk > 6 then 0.3 else 0 end
    + case when young_core >= 5 and rk <= 8 then 0.1 else 0 end;
  md := case when br->>'archetype' = 'caretaker' then 'balanced'
             when score > 0.35 then 'win_now' when score < -0.35 then 'rebuild' else 'balanced' end;

  return jsonb_build_object('mode', md, 'score', round(score, 2), 'strength', st, 'rank', rk,
    'old_core', old_core, 'young_core', young_core, 'expiring', expiring, 'cap_room', cap_room,
    'firsts', firsts, 'picks', total_picks, 'draft_season', nd, 'needs', needs, 'brain', br);
end $$;

create or replace function public.bot_mode(p_team text) returns text
language sql stable security definer set search_path to '' as $$ select public.bot_situation(p_team)->>'mode' $$;

-- What one player is worth to this team, in value points (5★ ≈ 100, 4.5★ ≈ 63, 4★ ≈ 40, 3★ ≈ 16).
create or replace function public.bot_player_value(p_player text, p_team text, p_mode text, p_brain jsonb, p_ours boolean)
returns numeric language plpgsql stable security definer set search_path to '' as $$
declare p public.players; pot numeric; per int; last_s int; yl int; yw numeric; eff numeric; v numeric; capw numeric;
  cs int := public.setting_int('current_season'); room int;
begin
  select * into p from public.players where id = p_player;
  if p.id is null then return 0; end if;
  select coalesce(potential, p.stars) into pot from public.player_potential where player_id = p.id;
  pot := coalesce(pot, p.stars);
  select per_year, last_season into per, last_s from public.contracts where player_id = p.id and status = 'active' limit 1;
  yl := greatest(1, public.setting_int('max_age') - coalesce(p.age, 25) + 1);
  yw := case p_mode when 'rebuild' then 0.6 when 'win_now' then 0.1 else 0.35 end
        * (0.6 + (p_brain #>> '{values,youth}')::numeric / 125);
  eff := coalesce(p.stars, 2) + greatest(0, pot - coalesce(p.stars, 2)) * yw * least(1, yl / 4.0);
  v := greatest(0.5, 100 * power(0.63, (5 - eff) * 2) - 5);
  v := v * case p_mode when 'win_now' then 1 when 'balanced' then 0.8 + 0.05 * least(yl, 4) else 0.55 + 0.1 * least(yl, 5) end;
  if eff >= 4 then v := v * (0.85 + (p_brain #>> '{values,stars}')::numeric / 333); end if;
  if p_mode = 'rebuild' and last_s is not null and last_s <= cs then v := v * 0.75; end if;  -- rental
  room := public.setting_int('cap_limit') - public.team_cap_committed(p_team);
  capw := (0.15 + (p_brain #>> '{values,cap}')::numeric / 285) * case when room < 250000 then 1.5 else 1 end;
  v := v - coalesce(per, 0) / 4000.0 * capw;
  v := v * public.bot_fit(p_team, p.position);
  if p_ours then v := v * (1 + ((p_brain->>'loyalty')::numeric - 3) * 0.04); end if;
  return round(greatest(0.25, v), 2);
end $$;

-- Where a pick should land: real slot if the order is set, otherwise projected from the original team's strength.
create or replace function public.bot_pick_slot(p_pick bigint) returns numeric
language sql stable security definer set search_path to '' as $$
  with k as (select k.*, t.id orig from public.picks k join public.teams t on upper(t.code) = upper(k.original_code) where k.id = p_pick)
  select coalesce(
    (select o.slot::numeric from public.draft_order o, k where o.season = k.season and o.team_id = k.orig),
    (select 8.5 + ((17 - public.team_strength_rank(k.orig)) - 8.5) * power(0.5, greatest(0, k.season - public.next_draft_season())) from k))
$$;

create or replace function public.bot_pick_value(p_pick bigint, p_team text, p_mode text, p_brain jsonb)
returns numeric language sql stable security definer set search_path to '' as $$
  select round((105 * exp(-0.065 * ((k.round - 1) * 16 + public.bot_pick_slot(k.id) - 1))
    * power(0.9, greatest(0, k.season - public.next_draft_season()))
    * case p_mode when 'rebuild' then 1.25 when 'win_now' then 0.75 else 1 end
    * (0.85 + (p_brain #>> '{values,picks}')::numeric / 333))::numeric, 2)
  from public.picks k where k.id = p_pick
$$;

-- Turn a value gap into words a coach would say.
create or replace function public.bot_gap_text(p_gap numeric) returns text
language sql immutable set search_path to '' as $$
  select case when p_gap <= 3 then 'a small sweetener (a 3rd-round pick would do it)'
    else format('about a %s★ player or a %s', greatest(2, least(5, round((5 - ln((p_gap + 5) / 100.0) / (2 * ln(0.63))) * 2) / 2))::numeric(3,1),
      case when p_gap > 40 then '1st-round pick' when p_gap > 12 then '2nd-round pick' else '3rd-round pick' end) end
$$;

-- Judge a trade from the receiving bot's point of view.
create or replace function public.bot_eval_trade(p_trade bigint) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare t public.trades; me text; sit jsonb; br jsonb; md text; it record; vals_in numeric[] := '{}'; vals_out numeric[] := '{}';
  w_in numeric[] := '{1,0.8,0.65,0.5,0.4}'; w_out numeric[] := '{1,0.9,0.8,0.7,0.6}'; v numeric; i int;
  in_val numeric := 0; out_val numeric := 0; edge numeric; need numeric; reasons text[] := '{}'; ok boolean;
  p_in int := 0; p_out int := 0; cap_in int := 0; cap_out int := 0; star_out boolean := false; star_in boolean := false;
begin
  select * into t from public.trades where id = p_trade;
  me := t.to_team; sit := public.bot_situation(me); br := sit->'brain'; md := sit->>'mode';
  for it in select i.side, i.player_id, i.pick_id, p.stars, c.per_year from public.trade_items i
            left join public.players p on p.id = i.player_id
            left join public.contracts c on c.player_id = i.player_id and c.status = 'active' where i.trade_id = t.id loop
    if it.player_id is not null then
      v := public.bot_player_value(it.player_id, me, md, br, it.side = 'get');
      if it.side = 'give' then p_in := p_in + 1; cap_in := cap_in + coalesce(it.per_year, 0); star_in := star_in or it.stars >= 4;
      else p_out := p_out + 1; cap_out := cap_out + coalesce(it.per_year, 0); star_out := star_out or it.stars >= 4.5; end if;
    else v := public.bot_pick_value(it.pick_id, me, md, br); end if;
    if it.side = 'give' then vals_in := vals_in || v; else vals_out := vals_out || v; end if;
  end loop;
  select array_agg(x order by x desc) into vals_in from unnest(vals_in) x;
  select array_agg(x order by x desc) into vals_out from unnest(vals_out) x;
  for i in 1..coalesce(array_length(vals_in, 1), 0) loop in_val := in_val + vals_in[i] * w_in[least(i, 5)]; end loop;
  for i in 1..coalesce(array_length(vals_out, 1), 0) loop out_val := out_val + vals_out[i] * w_out[least(i, 5)]; end loop;

  edge := (select (value #>> '{}')::numeric from public.league_settings where key = 'bot_trade_edge')
    + ((br->>'loyalty')::numeric - 3) * 0.02 - ((br->>'aggression')::numeric - 3) * 0.01
    + case when br->>'archetype' = 'old_school' then 0.05 else 0 end
    + case when md = 'win_now' and star_out and not star_in then 0.25 else 0 end;
  need := round(out_val * edge - in_val, 1);
  ok := in_val > 0 and need <= 0;

  reasons := reasons || case md when 'rebuild' then 'We''re rebuilding. Picks and young talent matter most to us.'
    when 'win_now' then 'We''re trying to win it all now. Proven players matter most.'
    else 'We''re in the middle, so we only move for real value.' end;
  if public.team_roster_count(me) - p_out + p_in > public.setting_int('max_roster') then
    ok := false; reasons := reasons || 'We don''t have roster room for that many players.'; end if;
  if public.team_cap_committed(me) - cap_out + cap_in > public.setting_int('cap_limit') then
    ok := false; reasons := reasons || 'That would put us over the salary cap.'; end if;
  if md = 'win_now' and star_out and not star_in then reasons := reasons || 'We''re not moving a star without getting a good player back.'; end if;
  if ok then reasons := reasons || 'That works for what we''re building.';
  elsif need > 0 and need <= out_val * 0.1 then reasons := reasons || format('Close. Add %s and it''s done.', public.bot_gap_text(need));
  elsif need > 0 then reasons := reasons || format('Not enough coming back. We''d want %s more.', public.bot_gap_text(need)); end if;

  return jsonb_build_object('accept', ok, 'in_value', round(in_val, 1), 'out_value', round(out_val, 1), 'edge', round(edge, 2),
    'need', greatest(need, 0), 'mode', md, 'reasons', to_jsonb(reasons));
end $$;
