-- 047: bot teams part 2. Three more coach types, a stored plan per coach, smarter re-signing and FA bids by plan,
-- fewer elite prospects from Season 9, bot trade blocks, rare bot-to-bot trades, rare offers to humans, a weekly bot run.

alter table public.coaches add column if not exists plan text;

insert into public.league_settings (key, value) values
  ('elite_rules_from_season', '9'), ('draft_pot5_min', '2'), ('draft_pot5_max', '3'), ('draft_pot45_count', '5'),
  ('bot_week_last', to_jsonb(now()::text))
on conflict (key) do nothing;

drop function if exists public.make_bot_brain(text);
create or replace function public.make_bot_brain(p_team text, p_arch text default null) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare t public.teams; archs text[]; arch text := p_arch; v jsonb; j int;
begin
  select * into t from public.teams where id = p_team;
  if t.reserved and p_arch is null then
    return jsonb_build_object('archetype', 'caretaker', 'aggression', 1, 'patience', 3, 'loyalty', 3,
      'values', jsonb_build_object('picks', 50, 'youth', 50, 'stars', 50, 'cap', 50));
  end if;
  if arch is null then
    archs := case t.gm_style
      when 'contender' then '{gunslinger,former_player,dealmaker,old_school,moneyball,steady}'::text[]
      when 'rebuilding' then '{architect,talent_scout,moneyball,steady,dealmaker,gunslinger}'::text[]
      else '{steady,moneyball,architect,old_school,former_player,dealmaker,talent_scout,gunslinger}'::text[] end;
    arch := archs[1 + floor(random() * array_length(archs, 1))::int];
  end if;
  v := case arch
    when 'gunslinger'    then '{"aggression":5,"patience":1,"loyalty":2,"values":{"picks":25,"youth":30,"stars":90,"cap":25}}'
    when 'architect'     then '{"aggression":2,"patience":5,"loyalty":3,"values":{"picks":90,"youth":85,"stars":40,"cap":55}}'
    when 'old_school'    then '{"aggression":1,"patience":3,"loyalty":5,"values":{"picks":40,"youth":35,"stars":70,"cap":40}}'
    when 'moneyball'     then '{"aggression":3,"patience":4,"loyalty":2,"values":{"picks":65,"youth":60,"stars":45,"cap":90}}'
    when 'former_player' then '{"aggression":3,"patience":3,"loyalty":4,"values":{"picks":35,"youth":45,"stars":80,"cap":35}}'
    when 'dealmaker'     then '{"aggression":4,"patience":2,"loyalty":1,"values":{"picks":60,"youth":50,"stars":60,"cap":50}}'
    when 'talent_scout'  then '{"aggression":2,"patience":4,"loyalty":3,"values":{"picks":80,"youth":95,"stars":35,"cap":50}}'
    else                      '{"aggression":3,"patience":3,"loyalty":3,"values":{"picks":55,"youth":55,"stars":60,"cap":55}}' end::jsonb;
  for j in 1..4 loop
    v := jsonb_set(v, array['values', (array['picks','youth','stars','cap'])[j]],
      to_jsonb(greatest(5, least(98, (v #>> array['values', (array['picks','youth','stars','cap'])[j]])::int + floor(random() * 17)::int - 8))));
  end loop;
  return v || jsonb_build_object('archetype', arch);
end $$;

-- Every full bot gets its own type (8 types, 8 bots), picked to suit the team.
update public.coaches set brain = public.make_bot_brain(team_id, a.arch)
from (values ('ntw','gunslinger'), ('ddc','former_player'), ('pln','dealmaker'), ('wsl','moneyball'),
             ('wrf','talent_scout'), ('ocn','architect'), ('ocm','steady'), ('drf','old_school')) a(team, arch)
where coaches.team_id = a.team;

-- New types lean the team plan a little.
do $do$
declare d text := pg_get_functiondef('public.bot_situation(text)'::regprocedure);
begin
  d := replace(d, 'when ''architect'' then -0.25 else 0 end', 'when ''architect'' then -0.25 when ''talent_scout'' then -0.15 when ''former_player'' then 0.1 else 0 end');
  if d not like '%talent_scout%' then raise exception 'situation patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.draft_bot_choice(text,integer)'::regprocedure);
  d := replace(d, '  noise := case', '  if sit #>> ''{brain,archetype}'' = ''talent_scout'' then yw := yw + 0.15; end if;
  noise := case');
  execute d;
end $do$;

-- Stored plan (so big loops don't re-read every roster), and the old 3-style word for older bot code.
create or replace function public.bot_refresh_modes() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare n int;
begin
  update public.coaches set plan = case when brain->>'archetype' = 'caretaker' then null else public.bot_mode(team_id) end where true;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.bot_style(p_team text) returns text
language sql stable security definer set search_path to '' as $$
  select case c.plan when 'win_now' then 'contender' when 'rebuild' then 'rebuilding' when 'balanced' then 'balanced' else t.gm_style end
  from public.teams t left join public.coaches c on c.team_id = t.id where t.id = p_team
$$;

select public.bot_refresh_modes();

-- Re-signing and FA bids follow the coach's plan instead of the fixed team style. Rebuilders let 26+ vets walk unless elite.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.bot_resign_all()'::regprocedure);
  d := replace(d, 'keep := case tm.gm_style', 'keep := case public.bot_style(tm.id)');
  d := replace(d, 'if tm.gm_style <> ''contender''', 'if public.bot_style(tm.id) <> ''contender''');
  d := replace(d, 'when ''rebuilding'' then (r.age <= 24 and r.pot > r.stars) or r.stars >= 4',
    'when ''rebuilding'' then (r.age <= 24 and r.pot > r.stars) or (r.stars >= 4 and r.age <= 25) or r.stars >= 4.5');
  if d like '%tm.gm_style%' then raise exception 'resign patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.bot_fa_offers()'::regprocedure);
  d := replace(d, 'case tm.gm_style', 'case public.bot_style(tm.id)');
  if d like '%tm.gm_style%' then raise exception 'fa patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.bot_star_bids()'::regprocedure);
  d := replace(d, 't.gm_style in (''contender'', ''balanced'')', 'public.bot_style(t.id) in (''contender'', ''balanced'')');
  d := replace(d, 'case tm.gm_style', 'case public.bot_style(tm.id)');
  if d like '%gm_style%' then raise exception 'star bids patch failed'; end if;
  execute d;
end $do$;

-- Fewer elite prospects from Season 9 on: 2-3 five-star potentials and 5 at 4.5 per class. Street free agents top out at 4.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer,integer)'::regprocedure);
  d := replace(d, 'made int := 0; pl public.players;', 'made int := 0; pl public.players; n5 int; n45 int;');
  d := replace(d, '    pot := (array[2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5])[1 + floor(random() * 20)::int];',
    '    pot := case when p_season >= coalesce(public.setting_int(''elite_rules_from_season''), 999)
      then (array[2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4])[1 + floor(random() * 17)::int]
      else (array[2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5])[1 + floor(random() * 20)::int] end;');
  d := replace(d, '  return made;
end',
    '  if p_season >= coalesce(public.setting_int(''elite_rules_from_season''), 999) then
    n5 := coalesce(public.setting_int(''draft_pot5_min''), 2) + floor(random() * (coalesce(public.setting_int(''draft_pot5_max''), 3) - coalesce(public.setting_int(''draft_pot5_min''), 2) + 1))::int;
    n45 := coalesce(public.setting_int(''draft_pot45_count''), 5);
    for pid, pot in select x.id, case when x.rn <= n5 then 5.0 else 4.5 end from (
        select id, row_number() over (order by random()) rn from public.players where status = ''prospect'' and draft_season = p_season) x
        where x.rn <= n5 + n45 loop
      update public.player_potential set potential = pot where player_id = pid;
      update public.players set stars = least(3.5, greatest(1, pot - 2 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int])) where id = pid;
      select * into pl from public.players where id = pid;
      update public.players set college_stats = public.college_profile(pl, pot) where id = pid;
    end loop;
  end if;
  return made;
end');
  if d not like '%draft_pot45_count%' or d not like '%elite_rules_from_season%' then raise exception 'draft class patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.generate_free_agents(integer)'::regprocedure);
  d := replace(d, '    pot := least(5, stars +', '    pot := least(case when season >= coalesce(public.setting_int(''elite_rules_from_season''), 999) then 4 else 5 end, stars +');
  if d not like '%elite_rules_from_season%' then raise exception 'free agent patch failed'; end if;
  execute d;
end $do$;
