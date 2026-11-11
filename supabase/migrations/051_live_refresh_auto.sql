-- 051: always-fresh numbers and auto-run on countdown.
-- 1) Player ranks: no ties (stars first, then exact rating), so only one player is ever #2.
-- 2) Team offense/defense/overall stars and ranks, and cap used, recalculate after any player or contract change.
-- 3) Seasons on the past trades (estimated from the dates and the picks that were traded).
-- 4) Auto-run: a schedule date can run its step by itself when the countdown hits 0 (never the draft or games).

create or replace view public.player_ranks as
  with x as (
    select p.id, p.position, p.stars,
      (avg(e.value::numeric) filter (where e.key <> all (array['speed', 'toughness']))
        * case when p.position = any (array['RB', 'WR', 'CB', 'SS']) then 0.85 else 1 end
        + case when p.position = any (array['RB', 'WR', 'CB', 'SS']) then (a.ratings ->> 'speed')::numeric * 0.15 else 0 end) exact
    from public.players p join public.player_attributes a on a.player_id = p.id
    cross join lateral jsonb_each_text(a.ratings) e(key, value)
    where p.status = any (array['active', 'free_agent'])
    group by p.id, p.position, p.stars, a.ratings)
  select id as player_id, round(exact)::integer as ovr,
    row_number() over (partition by position order by stars desc nulls last, exact desc, id) as pos_rank,
    row_number() over (order by stars desc nulls last, exact desc, id) as overall_rank
  from x;

create or replace function public.refresh_team_ratings() returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  with st as (
    select t.id team, rt.position,
      (select p.stars from public.players p where p.team_id = t.id and p.status = 'active' and p.position = rt.position
       order by p.stars desc nulls last, p.id offset g.n - 1 limit 1) stars
    from public.teams t cross join public.roster_template rt cross join lateral generate_series(1, rt.starters) g(n)),
  agg as (
    select team,
      avg(coalesce(stars, 1.5)) filter (where position in ('QB', 'RB', 'WR', 'TE', 'OT', 'OG', 'C')) o,
      avg(coalesce(stars, 1.5)) filter (where position in ('DL', 'DT', 'DE', 'LB', 'CB', 'SS')) d
    from st group by team),
  r as (
    select team, round(o * 2) / 2 os, round(d * 2) / 2 ds, round((o + d)) / 2 ovs,
      (row_number() over (order by o desc, team))::int ro, (row_number() over (order by d desc, team))::int rd,
      (row_number() over (order by o + d desc, team))::int rov, public.team_cap_committed(team) cap
    from agg)
  update public.teams t set offense_stars = r.os, defense_stars = r.ds, overall_stars = r.ovs,
    offense_rank = r.ro, defense_rank = r.rd, overall_rank = r.rov, cap_used_reported = r.cap
  from r where r.team = t.id
    and (t.offense_stars, t.defense_stars, t.overall_stars, t.offense_rank, t.defense_rank, t.overall_rank, t.cap_used_reported)
        is distinct from (r.os, r.ds, r.ovs, r.ro, r.rd, r.rov, r.cap);
end $$;

create or replace function public.trg_refresh_team_ratings() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  perform public.refresh_team_ratings();
  return null;
end $$;

drop trigger if exists players_refresh_ratings on public.players;
create trigger players_refresh_ratings after insert or delete or update of team_id, stars, status, position on public.players
  for each statement execute function public.trg_refresh_team_ratings();
drop trigger if exists contracts_refresh_ratings on public.contracts;
create trigger contracts_refresh_ratings after insert or delete or update on public.contracts
  for each statement execute function public.trg_refresh_team_ratings();

select public.refresh_team_ratings();

-- Seasons on past trades (estimates from the trade dates and which drafts' picks were being traded).
update public.player_moves set season = case
    when happened_at < '2024-06-01' then 2
    when happened_at < '2024-08-01' then 3
    when happened_at < '2025-01-01' then 3
    when happened_at < '2026-01-01' then 5
    when happened_at < '2026-09-01' then 7
    else 8 end
where season is null;

-- Auto-run on countdown.
alter table public.league_schedule add column if not exists auto boolean not null default false,
  add column if not exists auto_ran_at timestamptz, add column if not exists auto_error text;

create or replace function public.auto_kinds() returns text[]
language sql immutable set search_path to '' as $$
  select '{birthday,resign,fa_open,fa_round_1,fa_round_2,fa_round_3,fa_round_4,camp}'::text[]
$$;

create or replace function public.set_schedule_auto(p_season int, p_kind text, p_auto boolean) returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not (p_kind = any (public.auto_kinds())) then raise exception 'This one always needs the commissioner to start it'; end if;
  update public.league_schedule set auto = p_auto, auto_ran_at = null, auto_error = null where season = p_season and kind = p_kind;
  if not found then raise exception 'Set a date first'; end if;
end $$;

-- The step and free agency round functions, minus the commissioner check, so the auto runner can call them.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  d := replace(d, 'FUNCTION public.advance_offseason()', 'FUNCTION public.advance_offseason_core()');
  d := regexp_replace(d, '\n\s*if not public\.is_commissioner\(\) then raise exception ''not allowed''; end if;', '');
  if d like '%is_commissioner()%' then raise exception 'core copy still checks the commissioner'; end if;
  execute d;
  d := pg_get_functiondef('public.run_fa_round()'::regprocedure);
  d := replace(d, 'FUNCTION public.run_fa_round()', 'FUNCTION public.run_fa_round_core()');
  d := regexp_replace(d, '\n\s*if not public\.is_commissioner\(\) then raise exception ''not allowed''; end if;', '');
  if d like '%is_commissioner()%' then raise exception 'fa core copy still checks the commissioner'; end if;
  execute d;
end $do$;
revoke execute on function public.advance_offseason_core() from public, anon, authenticated;
revoke execute on function public.run_fa_round_core() from public, anon, authenticated;

create or replace function public.advance_offseason() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  return public.advance_offseason_core();
end $$;

do $do$
declare res text := pg_get_function_result('public.run_fa_round()'::regprocedure);
begin
  execute format('create or replace function public.run_fa_round() returns %s language plpgsql volatile security definer set search_path to '''' as $f$
begin
  if not public.is_commissioner() then raise exception ''not allowed''; end if;
  return public.run_fa_round_core();
end $f$', res);
end $do$;

-- Runs every date that's due and set to auto, if its step is the next one. Earlier steps not done yet? It waits.
create or replace function public.auto_tick() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare r record; cs int := public.setting_int('current_season'); step int; ph text; rnd int; target int; ran int := 0;
  steps jsonb := '{"birthday":0,"resign":1,"fa_open":2,"camp":4}';
begin
  for r in select * from public.league_schedule where season = cs and auto and auto_ran_at is null and starts_at <= now() order by starts_at loop
    step := public.setting_int('offseason_step'); rnd := public.setting_int('fa_round');
    ph := (select value #>> '{}' from public.league_settings where key = 'phase');
    begin
      if r.kind like 'fa_round_%' then
        target := substr(r.kind, 10)::int;
        if ph = 'offseason' and step = 3 and rnd = target - 1 then perform public.run_fa_round_core();
        elsif not (ph = 'offseason' and step <= 3 and rnd < target) then null; -- already happened by hand
        else continue; end if;
      else
        target := (steps ->> r.kind)::int;
        if ph = 'offseason' and step = target then perform public.advance_offseason_core();
        elsif ph = 'offseason' and step < target then continue;
        end if;
      end if;
      update public.league_schedule set auto_ran_at = now(), auto_error = null where season = r.season and kind = r.kind;
      perform public.log_event('auto_run', null, null, format('%s ran on its countdown', r.label));
      ran := ran + 1;
    exception when others then
      if r.auto_error is null then
        perform public.notify(null, true, false, 'auto_failed', format('%s couldn''t run on its countdown', r.label),
          format('%s It will try again every minute, or you can run it from the Commissioner''s Desk.', sqlerrm), jsonb_build_object('kind', r.kind));
      end if;
      update public.league_schedule set auto_error = sqlerrm where season = r.season and kind = r.kind;
    end;
  end loop;
  return ran;
end $$;

-- Every open copy of the site calls this about twice a minute: auto-run dates, then bot trade replies.
create or replace function public.league_tick() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare a int; b int;
begin
  a := public.auto_tick();
  b := public.bot_tick();
  return jsonb_build_object('auto', a, 'bots', b);
end $$;
grant execute on function public.league_tick() to anon, authenticated;
