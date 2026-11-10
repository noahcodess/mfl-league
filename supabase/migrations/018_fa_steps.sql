-- The offseason steps with free agency built in.
-- Step 3 (re-signing closes): bots re-sign, the rest hit free agency remembering their old team, leftover talks
--   expire, the round counter resets and street free agents top up the pool.
-- Step 4 (free agency closes): coach deals must be approved first, bots fill their empty spots, open offers expire.
create or replace function public.advance_offseason() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  step int := public.setting_int('offseason_step');
  season int := public.setting_int('current_season');
  max_age int := coalesce(public.setting_int('max_age'), 27);
  phase text := (select value #>> '{}' from public.league_settings where key = 'phase');
  names text[] := array['Birthday Day', 'Retirements', 'Re-signing', 'Free agency', 'Draft', 'Training camp'];
  n int := 0; extra int;
  r record;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if phase is distinct from 'offseason' then raise exception 'not in the offseason'; end if;
  if step is null or step < 0 or step > 5 then raise exception 'bad offseason step'; end if;
  if step in (3, 4) and exists (select 1 from public.negotiations where status = 'agreed') then
    raise exception 'Approve or deny the deals waiting in your inbox first';
  end if;
  perform public.take_snapshot(format('Before %s (Season %s)', names[step + 1], season));

  if step = 0 then -- Birthday Day: everyone a year older (ages over 60 are data typos)
    update public.players set age = age + 1 where status <> 'retired' and age is not null and age < 60;
    get diagnostics n = row_count;
    update public.league_settings set value = to_jsonb(season) where key = 'aged_for_season';
    perform public.log_event('birthday', null, null, format('Birthday Day: %s players turned a year older', n), jsonb_build_object('players', n));
  elsif step = 1 then -- Retirements: past the max age (free agents too)
    for r in select id, name, team_id, age, stars from public.players where status <> 'retired' and age > max_age and age < 60 loop
      update public.players set status = 'retired', team_id = null, number = null, depth = null, slot = null where id = r.id;
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
  elsif step = 3 then -- Re-signing closes; free agency opens
    perform public.log_event('bots_resigned', null, null, format('Bot teams re-signed %s players', public.bot_resign_all()));
    for r in select p.id, p.name, p.team_id, p.position from public.players p
             where p.status = 'active' and p.team_id is not null
               and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active') loop
      update public.players set status = 'free_agent', previous_team_id = r.team_id, team_id = null, number = null, depth = null, slot = null where id = r.id;
      perform public.log_event('free_agent', r.id, r.team_id, format('%s hit free agency', r.name));
      n := n + 1;
    end loop;
    for r in select distinct p.previous_team_id as team_id, p.position from public.players p
             where p.status = 'free_agent' and p.previous_team_id is not null loop
      perform public.place_depth(r.team_id, r.position); -- close the gaps the free agents left
    end loop;
    update public.negotiations set status = 'expired', updated_at = now() where status in ('open', 'walked');
    update public.league_settings set value = '0' where key = 'fa_round';
    extra := public.top_up_free_agents();
    if extra > 0 then
      perform public.log_event('street_free_agents', null, null, format('%s new players joined the free agent pool', extra), jsonb_build_object('players', extra));
    end if;
    perform public.log_event('fa_open', null, null, format('Free agency is open: %s players on the market',
      (select count(*) from public.players where status = 'free_agent')));
  elsif step = 4 then -- Free agency closes: bots fill empty spots, leftover offers expire
    extra := public.bot_fill_rosters();
    update public.fa_offers set status = 'expired' where status = 'open';
    perform public.log_event('fa_closed', null, null, format('Free agency closed. Bot teams filled %s open spots with leftover free agents', extra),
      jsonb_build_object('filled', extra));
    perform public.log_event('draft', null, null, format('Season %s draft completed', season)); -- the draft room plugs in here later
  elsif step = 5 then -- Training camp ends: the regular season begins
    update public.league_settings set value = '"regular_season"' where key = 'phase';
    perform public.log_event('season_start', null, null, format('Season %s regular season begins', season));
  end if;

  update public.league_settings set value = to_jsonb(case when step = 5 then 0 else step + 1 end) where key = 'offseason_step';
  return jsonb_build_object('step', names[step + 1], 'affected', n);
end $$;
