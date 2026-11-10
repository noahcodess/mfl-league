-- Birthday Day and Retirements become one step ("Birthday & Farewell"), so the offseason is 5 steps:
-- 0 Birthday & Farewell, 1 Re-signing (window opens), 2 Free agency (market opens), 3 Draft (market closes), 4 Training camp.
-- offseason_step is the NEXT step to run, so the re-signing window is open at 2 and the market at 3.
-- Also: a public bidding board with an interest meter per offer, a live meter for your own offer, and bots that chase stars.

-- Windows move down one step.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.negotiate_resign(text,int,int,text)'::regprocedure);
  execute replace(d, 'public.setting_int(''offseason_step'') <> 3', 'public.setting_int(''offseason_step'') <> 2');
  d := pg_get_functiondef('public.fa_open()'::regprocedure);
  execute replace(d, 'public.setting_int(''offseason_step'') = 4', 'public.setting_int(''offseason_step'') = 3');
end $$;

create or replace function public.advance_offseason() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  step int := public.setting_int('offseason_step');
  season int := public.setting_int('current_season');
  max_age int := coalesce(public.setting_int('max_age'), 27);
  phase text := (select value #>> '{}' from public.league_settings where key = 'phase');
  names text[] := array['Birthday & Farewell', 'Re-signing', 'Free agency', 'Draft', 'Training camp'];
  n int := 0; extra int; r record;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if phase is distinct from 'offseason' then raise exception 'not in the offseason'; end if;
  if step is null or step < 0 or step > 4 then raise exception 'bad offseason step'; end if;
  if step in (2, 3) and exists (select 1 from public.negotiations where status = 'agreed') then
    raise exception 'Approve or deny the deals waiting in your inbox first';
  end if;
  perform public.take_snapshot(format('Before %s (Season %s)', names[step + 1], season));

  if step = 0 then -- Birthday & Farewell: everyone a year older, then anyone past the max age retires
    update public.players set age = age + 1 where status <> 'retired' and age is not null and age < 60;
    get diagnostics n = row_count;
    update public.league_settings set value = to_jsonb(season) where key = 'aged_for_season';
    perform public.log_event('birthday', null, null, format('Birthday & Farewell: %s players turned a year older', n), jsonb_build_object('players', n));
    for r in select id, name, team_id, age, stars from public.players where status <> 'retired' and age > max_age and age < 60 loop
      update public.players set status = 'retired', team_id = null, number = null, depth = null, slot = null where id = r.id;
      update public.contracts set status = 'retired' where player_id = r.id and status = 'active';
      perform public.log_event('retired', r.id, r.team_id, format('%s retired at age %s', r.name, r.age), jsonb_build_object('age', r.age, 'stars', r.stars));
    end loop;
    for r in select distinct p.team_id, p.position from public.players p where p.status = 'active' and p.team_id is not null loop
      perform public.place_depth(r.team_id, r.position);
    end loop;
  elsif step = 1 then -- Contracts that ran through last season end; the re-signing window opens
    for r in select c.id, c.player_id, c.team_id, p.name from public.contracts c join public.players p on p.id = c.player_id
             where c.status = 'active' and c.last_season < season loop
      update public.contracts set status = 'expired' where id = r.id;
      perform public.log_event('contract_expired', r.player_id, r.team_id, format('%s''s contract ended. He can be re-signed.', r.name));
      n := n + 1;
    end loop;
  elsif step = 2 then -- Re-signing closes; free agency opens
    perform public.log_event('bots_resigned', null, null, format('Bot teams re-signed %s players', public.bot_resign_all()));
    for r in select p.id, p.name, p.team_id from public.players p
             where p.status = 'active' and p.team_id is not null
               and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active') loop
      update public.players set status = 'free_agent', previous_team_id = r.team_id, team_id = null, number = null, depth = null, slot = null where id = r.id;
      perform public.log_event('free_agent', r.id, r.team_id, format('%s hit free agency', r.name));
      n := n + 1;
    end loop;
    for r in select distinct p.previous_team_id as team_id, p.position from public.players p
             where p.status = 'free_agent' and p.previous_team_id is not null loop
      perform public.place_depth(r.team_id, r.position);
    end loop;
    update public.negotiations set status = 'expired', updated_at = now() where status in ('open', 'walked');
    update public.league_settings set value = '0' where key = 'fa_round';
    extra := public.top_up_free_agents();
    if extra > 0 then
      perform public.log_event('street_free_agents', null, null, format('%s new players joined the free agent pool', extra), jsonb_build_object('players', extra));
    end if;
    perform public.log_event('fa_open', null, null, format('Free agency is open: %s players on the market',
      (select count(*) from public.players where status = 'free_agent')));
  elsif step = 3 then -- Free agency closes: bots fill empty spots, leftover offers expire; then the draft
    extra := public.bot_fill_rosters();
    update public.fa_offers set status = 'expired' where status = 'open';
    perform public.log_event('fa_closed', null, null, format('Free agency closed. Bot teams filled %s open spots with leftover free agents', extra),
      jsonb_build_object('filled', extra));
    perform public.log_event('draft', null, null, format('Season %s draft completed', season)); -- the draft room plugs in here later
  elsif step = 4 then -- Training camp ends: the regular season begins
    update public.league_settings set value = '"regular_season"' where key = 'phase';
    perform public.log_event('season_start', null, null, format('Season %s regular season begins', season));
  end if;

  update public.league_settings set value = to_jsonb(case when step = 4 then 0 else step + 1 end) where key = 'offseason_step';
  return jsonb_build_object('step', names[step + 1], 'affected', n);
end $$;

-- Interest meter: 0-100, where 80 is the line he'd sign at next round. Above it, the higher the better his odds.
create or replace function public.fa_interest(p public.players, p_team text, p_years int, p_per_year int, p_role text) returns int
language sql stable security definer set search_path = '' as $$
  select least(100, round(80 * p_per_year::numeric / nullif(public.required_price(p, p_team, p_years, p_role)
    * public.fa_desperation(public.setting_int('fa_round') + 1), 0)))::int
$$;

-- The bidding board: every open offer on a player, best interest first. Anyone can watch it.
create or replace function public.fa_board(p_player text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.players;
begin
  select * into p from public.players where id = p_player;
  if p.id is null then return '[]'; end if;
  return coalesce((select jsonb_agg(b order by (b->>'interest')::int desc, (b->>'per_year')::int desc) from (
    select jsonb_build_object('team_id', o.team_id, 'years', o.years, 'per_year', o.per_year, 'role', o.role,
      'interest', public.fa_interest(p, o.team_id, o.years, o.per_year, o.role), 'mine', o.team_id = public.my_team_id()) b
    from public.fa_offers o where o.player_id = p.id and o.status = 'open') x), '[]');
end $$;

-- Quote now carries what he'd need from your team for each length and role, so your meter moves as you type.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.fa_quote(text)'::regprocedure);
  execute replace(d, '''interest'', (select count(*)',
    '''need'', case when my_team is null then null else (select jsonb_object_agg(r, (select jsonb_agg(public.round5k(public.required_price(p, my_team, y, r)
       * public.fa_desperation(public.setting_int(''fa_round'') + 1))) from generate_series(1, 3) y)) from unnest(array[''starter'', ''backup'']) r) end,
    ''interest'', (select count(*)');
end $$;

-- Bots sometimes go after a star (4+): only when they need the position (an empty or much weaker starting spot),
-- they're win-now (contender) or win-soon (balanced), they have the money, and their coach feels like it.
create or replace function public.bot_star_bids() returns int
language plpgsql security definer set search_path = '' as $$
declare
  tm record; s record; pl public.players; cap int := public.setting_int('cap_limit'); room int; weakest numeric; starters int;
  slots int; yrs int; price int; made int := 0;
begin
  for s in select p.* from public.players p where p.status = 'free_agent' and p.stars >= 4
           and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'agreed') order by p.stars desc loop
    select * into pl from public.players where id = s.id;
    select rt.starters into slots from public.roster_template rt where rt.position = pl.position;
    for tm in select * from public.teams t where public.is_bot_team(t.id) and t.gm_style in ('contender', 'balanced') order by random() loop
      continue when exists (select 1 from public.fa_offers o where o.player_id = pl.id and o.team_id = tm.id and o.status = 'open');
      continue when public.team_roster_count(tm.id) + (select count(*) from public.fa_offers o where o.team_id = tm.id and o.status = 'open') >= public.setting_int('max_roster');
      select count(*), min(x.stars) into starters, weakest from public.players x
        where x.team_id = tm.id and x.position = pl.position and x.status = 'active' and x.depth = 'starter';
      continue when starters >= coalesce(slots, 1) and weakest > pl.stars - 1; -- no real need
      continue when random() > case tm.gm_style when 'contender' then 0.6 else 0.35 end; -- the coach's call
      yrs := public.preferred_years(pl);
      price := public.round5k(public.required_price(pl, tm.id, yrs, 'starter')
        * case tm.gm_style when 'contender' then 1.0 + random()::numeric * 0.25 else 0.95 + random()::numeric * 0.15 end);
      if price * yrs > 1000000 then yrs := greatest(1, 1000000 / price); end if;
      room := cap - public.team_cap_committed(tm.id) - coalesce((select sum(per_year) from public.fa_offers where team_id = tm.id and status = 'open'), 0);
      continue when price > room - 200000 or price * yrs > 1000000;
      insert into public.fa_offers (player_id, team_id, season, round, years, per_year, role)
      values (pl.id, tm.id, public.setting_int('current_season'), public.setting_int('fa_round') + 1, yrs, price, 'starter');
      made := made + 1;
    end loop;
  end loop;
  return made;
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.run_fa_round()'::regprocedure);
  execute replace(d, 'bids := public.bot_fa_offers();', 'bids := public.bot_star_bids() + public.bot_fa_offers();');
end $$;

revoke execute on function public.fa_interest(public.players, text, int, int, text), public.bot_star_bids() from public, anon, authenticated;
grant execute on function public.fa_board(text) to anon, authenticated;
