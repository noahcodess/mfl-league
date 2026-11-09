-- Offseason steps, run by the commissioner one at a time: each step snapshots the league first so it can be undone.
-- Order: 0 Birthday Day, 1 Retirements, 2 Re-signing (contracts end), 3 Free agency, 4 Draft, 5 Training camp.

create or replace function public.setting_int(k text) returns int
language sql stable security definer set search_path = '' as $$
  select (value #>> '{}')::int from public.league_settings where key = k
$$;

create or replace function public.log_event(p_kind text, p_player text, p_team text, p_summary text, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.league_events (season, phase, kind, player_id, team_id, summary, data)
  values (public.setting_int('current_season'), (select value #>> '{}' from public.league_settings where key = 'phase'),
          p_kind, p_player, p_team, p_summary, p_data)
$$;

-- Saves everything a step can change. Keeps the 20 most recent.
create or replace function public.take_snapshot(p_label text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid bigint;
begin
  insert into public.league_snapshots (label, settings, players, contracts, last_event_id, created_by)
  values (p_label,
    (select jsonb_object_agg(key, value) from public.league_settings),
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'age', age, 'team_id', team_id, 'status', status, 'depth', depth, 'slot', slot)), '[]') from public.players),
    (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.contracts c),
    coalesce((select max(id) from public.league_events), 0), auth.uid())
  returning id into sid;
  delete from public.league_snapshots where id not in (select id from public.league_snapshots order by id desc limit 20);
  return sid;
end $$;

create or replace function public.advance_offseason() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  step int := public.setting_int('offseason_step');
  season int := public.setting_int('current_season');
  max_age int := coalesce(public.setting_int('max_age'), 27);
  phase text := (select value #>> '{}' from public.league_settings where key = 'phase');
  names text[] := array['Birthday Day', 'Retirements', 'Re-signing', 'Free agency', 'Draft', 'Training camp'];
  n int := 0;
  r record;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if phase is distinct from 'offseason' then raise exception 'not in the offseason'; end if;
  if step is null or step < 0 or step > 5 then raise exception 'bad offseason step'; end if;
  perform public.take_snapshot(format('Before %s (Season %s)', names[step + 1], season));

  if step = 0 then -- Birthday Day: everyone a year older (ages over 60 are data typos)
    update public.players set age = age + 1 where status <> 'retired' and age is not null and age < 60;
    get diagnostics n = row_count;
    update public.league_settings set value = to_jsonb(season) where key = 'aged_for_season';
    perform public.log_event('birthday', null, null, format('Birthday Day: %s players turned a year older', n), jsonb_build_object('players', n));
  elsif step = 1 then -- Retirements: past the max age
    for r in select id, name, team_id, age, stars from public.players where status <> 'retired' and age > max_age and age < 60 loop
      update public.players set status = 'retired', team_id = null where id = r.id;
      update public.contracts set status = 'retired' where player_id = r.id and status = 'active';
      perform public.log_event('retired', r.id, r.team_id, format('%s retired at age %s', r.name, r.age), jsonb_build_object('age', r.age, 'stars', r.stars));
      n := n + 1;
    end loop;
  elsif step = 2 then -- Contracts that ran through last season end; the re-signing window opens
    for r in select c.id, c.player_id, c.team_id, p.name from public.contracts c join public.players p on p.id = c.player_id
             where c.status = 'active' and c.last_season < season loop
      update public.contracts set status = 'expired' where id = r.id;
      perform public.log_event('contract_expired', r.player_id, r.team_id, format('%s''s contract ended. He can be re-signed.', r.name));
      n := n + 1;
    end loop;
  elsif step = 3 then -- Re-signing closes: anyone still unsigned becomes a free agent
    for r in select p.id, p.name, p.team_id from public.players p
             where p.status = 'active' and p.team_id is not null
               and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active') loop
      update public.players set status = 'free_agent', team_id = null, depth = null, slot = null where id = r.id;
      perform public.log_event('free_agent', r.id, r.team_id, format('%s hit free agency', r.name));
      n := n + 1;
    end loop;
  elsif step = 4 then -- Draft (the draft room plugs in here later)
    perform public.log_event('draft', null, null, format('Season %s draft completed', season));
  elsif step = 5 then -- Training camp ends: the regular season begins
    update public.league_settings set value = '"regular_season"' where key = 'phase';
    perform public.log_event('season_start', null, null, format('Season %s regular season begins', season));
  end if;

  update public.league_settings set value = to_jsonb(case when step = 5 then 0 else step + 1 end) where key = 'offseason_step';
  return jsonb_build_object('step', names[step + 1], 'affected', n);
end $$;

-- Puts the league back exactly as it was before the most recent step.
create or replace function public.undo_last_step() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.league_snapshots;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into s from public.league_snapshots order by id desc limit 1;
  if s.id is null then raise exception 'nothing to undo'; end if;
  delete from public.players where id not in (select x->>'id' from jsonb_array_elements(s.players) x);
  update public.players p set age = (x->>'age')::int, team_id = x->>'team_id', status = x->>'status', depth = x->>'depth', slot = (x->>'slot')::int
    from jsonb_array_elements(s.players) x where p.id = x->>'id';
  delete from public.contracts where true;
  insert into public.contracts overriding system value select * from jsonb_populate_recordset(null::public.contracts, s.contracts);
  delete from public.league_events where id > s.last_event_id;
  update public.league_settings ls set value = s.settings -> ls.key where s.settings ? ls.key;
  delete from public.league_snapshots where id = s.id;
  return jsonb_build_object('undone', s.label);
end $$;

-- What the commissioner can undo right now (label only).
create or replace function public.last_snapshot_label() returns text
language sql stable security definer set search_path = '' as $$
  select label from public.league_snapshots order by id desc limit 1
$$;

revoke execute on function public.setting_int(text), public.log_event(text, text, text, text, jsonb), public.take_snapshot(text) from public, anon, authenticated;
revoke execute on function public.advance_offseason(), public.undo_last_step(), public.last_snapshot_label() from public, anon;
grant execute on function public.advance_offseason(), public.undo_last_step(), public.last_snapshot_label() to authenticated;
