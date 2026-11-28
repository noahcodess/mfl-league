-- 106: two loop fixes.
-- 1) Nothing ever set the next draft's order, so after Season 8 the draft made no picks and the rookies never joined the
--    league. Birthday & Farewell (offseason step 0) now sets this season's draft order from last season's finish, and
--    the Draft step checks again before it runs.
-- 2) Growth and decline follow one rule: a player keeps growing (any age) until he reaches his potential, and only a
--    player who has reached it can decline.

-- Sets a season's draft order (worst finish picks first, the Craft Bowl champion last) if it isn't set yet. Needs last
-- season's results; without them it leaves it alone.
create or replace function public.ensure_draft_order(p_season int) returns int language plpgsql security definer set search_path to '' as $function$
begin
  if exists (select 1 from public.draft_order where season = p_season) then return 0; end if;
  if not exists (select 1 from public.team_seasons where season = p_season - 1) then return 0; end if;
  return public.set_draft_order(p_season);
end $function$;

-- advance_offseason_core: patched in place (only these two spots change).
do $patch$
declare d text := pg_get_functiondef('public.advance_offseason_core()'::regprocedure); n text;
begin
  n := replace(d, E'    perform public.bot_refresh_modes();\n  elsif step = 1 then',
    E'    perform public.ensure_draft_order(season);   -- this season''s draft order, from last season''s finish\n    perform public.bot_refresh_modes();\n  elsif step = 1 then');
  n := replace(n, E'  elsif step = 3 then\n    n := public.draft_finish_all(season);',
    E'  elsif step = 3 then\n    perform public.ensure_draft_order(season);   -- safety net if it''s still missing\n    n := public.draft_finish_all(season);');
  if n = d or (length(n) - length(d)) < 150 then raise exception 'advance_offseason_core patch did not apply'; end if;
  execute n;
end $patch$;

create or replace function public.develop_players() returns integer language plpgsql security definer set search_path to '' as $function$
declare r record; new_stars numeric; share numeric; old jsonb; out jsonb; k text; v int; made int := 0;
  power_gain numeric; speed_gain numeric; dw numeric; cs int := public.setting_int('current_season');
begin
  -- every player still short of his potential grows (any age), until he gets there; after that he can only decline
  for r in select p.*, pp.potential as pot, pp.ceilings from public.players p join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and pp.potential > p.stars and coalesce(p.peak_stars, p.stars) < pp.potential
             and p.last_drop_season is distinct from cs loop
    new_stars := least(r.pot, r.stars + 1);
    continue when new_stars <= r.stars;
    share := (new_stars - r.stars) / (r.pot - r.stars);
    select ratings into old from public.player_attributes where player_id = r.id;
    if old is not null then
      out := '{}';
      for k, v in select key, value::int from jsonb_each_text(old) loop
        out := out || jsonb_build_object(k, least(99, v + greatest(0, round((coalesce((r.ceilings->>k)::int, v) - v) * share))));
      end loop;
      update public.player_attributes set ratings = out, updated_at = now() where player_id = r.id;
      select coalesce(avg((out->>key)::numeric - (old->>key)::numeric), 0) into power_gain
        from unnest(array['strength', 'anchor', 'power_moves', 'break_tackle', 'hit_power', 'run_block', 'run_stop']) key where old ? key;
      speed_gain := coalesce((out->>'speed')::numeric - (old->>'speed')::numeric, 0);
      dw := power_gain * 0.8 - speed_gain * 1.0 + (random() * 4 - 1);
    else dw := 0; end if;
    update public.players set stars = new_stars,
      weight_lb = least(coalesce(base_weight_lb, weight_lb) + 30, greatest(coalesce(base_weight_lb, weight_lb) - 30, weight_lb + round(dw)))
      where id = r.id;
    if new_stars - r.stars >= 1 then
      perform public.log_event('developed', r.id, r.team_id, format('%s made a big jump: %s to %s stars', r.name, r.stars, new_stars));
    end if;
    made := made + 1;
  end loop;
  return made;
end $function$;

create or replace function public.regress_players() returns integer language plpgsql security definer set search_path to '' as $function$
declare r record; d numeric; chance numeric; made int := 0; cs int := public.setting_int('current_season');
begin
  if cs < coalesce(public.setting_int('regression_from_season'), 8) then return 0; end if;
  for r in select p.*, coalesce(pp.potential, p.stars) pot from public.players p left join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and p.age between 25 and 27 and p.stars is not null
             and coalesce(p.peak_stars, p.stars) >= coalesce(pp.potential, p.stars) loop   -- only once he's reached his potential
    chance := case r.age
      when 25 then greatest(0.05, least(0.6, 0.27 + case when r.depth = 'starter' then -0.10 else 0.12 end + case when r.stars <= 3 then 0.05 when r.stars >= 4.5 then -0.15 else 0 end))
      when 26 then case when r.stars >= 4.5 then 0.72 else 0.85 end
      else 1 end;
    continue when random() >= chance;
    d := case r.age when 25 then 0.5 when 26 then (case when random() < 0.7 then 0.5 else 1 end)
         else (case when random() < 0.5 then 0.5 when random() < 0.8 then 1 else 1.5 end) end;
    d := least(d, r.stars - greatest(coalesce(r.peak_stars, r.stars) - 2, 1));
    continue when d <= 0;
    update public.players set stars = stars - d, last_drop = d, last_drop_season = cs where id = r.id;
    perform public.regress_ratings(r.id, d);
    if d >= 1 then perform public.log_event('regressed', r.id, r.team_id, format('%s slowed down: %s to %s stars', r.name, r.stars, r.stars - d)); end if;
    made := made + 1;
  end loop;
  return made;
end $function$;
