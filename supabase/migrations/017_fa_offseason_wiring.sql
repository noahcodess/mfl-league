-- Wires free agency into the offseason: players who refuse to re-sign, previous teams, the free agency window
-- (street free agents, round counter), closing it (bots fill rosters, leftover offers expire), approvals for
-- free agency signings, and snapshots that cover offers so every step and round can be undone.

-- Re-signing talks, now with players who won't negotiate at all because they want to test the market.
create or replace function public.negotiate_resign(p_player text, p_years int, p_per_year int, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.players; t public.player_traits; n public.negotiations;
  my_team text := public.my_team_id();
  season int := public.setting_int('current_season');
  cap int := public.setting_int('cap_limit');
  req int; ratio numeric; result text; counter_price int; counter_years int; cost int; line text;
begin
  if my_team is null then raise exception 'Only a team''s coach can negotiate'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'offseason' or public.setting_int('offseason_step') <> 3 then
    raise exception 'The re-signing window is closed';
  end if;
  select * into p from public.players where id = p_player;
  if p.id is null or p.team_id is distinct from my_team or p.status <> 'active' then raise exception 'He isn''t on your team'; end if;
  if exists (select 1 from public.contracts where player_id = p.id and status = 'active') then raise exception 'He''s already under contract'; end if;
  if p_years not between 1 and 3 then raise exception 'Deals are 1 to 3 years'; end if;
  if p_years > public.max_years(p) then raise exception 'He would pass the max age before that deal ends'; end if;
  if p_role not in ('starter', 'backup') then raise exception 'Pick a role'; end if;
  if p_per_year < 10000 then raise exception 'The minimum salary is $10K a year'; end if;
  if p_per_year * p_years > 1000000 then raise exception 'Contracts max out at $1M total'; end if;
  if public.team_cap_committed(my_team) + p_per_year > cap then raise exception 'Not enough cap room for that offer'; end if;
  select * into t from public.player_traits where player_id = p.id;

  select * into n from public.negotiations where player_id = p.id and status in ('open', 'agreed', 'walked');
  if n.status = 'walked' then raise exception 'He''s done negotiating. He''ll hit free agency.'; end if;
  if n.status = 'agreed' then raise exception 'You already have a deal. It''s waiting for the commissioner.'; end if;
  if n.id is null then
    insert into public.negotiations (player_id, team_id, season, patience, ask_per_year, ask_years)
    values (p.id, my_team, season, t.patience, public.ask_price(p), public.preferred_years(p)) returning * into n;
    -- Some players won't even listen: they want to see what the market pays.
    if public.wants_to_test_market(p) then
      line := case when p.mood = 'angry' then 'Nah, Coach. I''m not doing this again. I want out.'
                   else 'Appreciate it, but I want to see what''s out there. Maybe we talk again in free agency.' end;
      update public.negotiations set status = 'walked', patience = 0,
        offer = jsonb_build_object('years', p_years, 'per_year', p_per_year, 'role', p_role),
        history = jsonb_build_array(jsonb_build_object('years', p_years, 'per_year', p_per_year, 'role', p_role, 'result', 'walked', 'line', line, 'at', now()))
      where id = n.id;
      perform public.log_event('talks_ended', p.id, my_team, format('%s won''t re-sign. He wants to test free agency.', p.name));
      return jsonb_build_object('result', 'walked', 'line', line, 'patience', 0, 'counter', null);
    end if;
  end if;

  req := public.required_price(p, my_team, p_years, p_role);
  ratio := p_per_year::numeric / req;
  if ratio >= 1 then
    result := 'accepted';
  else
    cost := case when ratio < 0.7 then 2 else 1 end;
    n.patience := n.patience - cost;
    if n.patience <= 0 then
      result := 'walked';
    elsif ratio >= 0.85 then
      result := 'countered';
      counter_years := public.preferred_years(p);
      counter_price := public.required_price(p, my_team, counter_years, p_role);
      if public.required_price(p, my_team, p_years, p_role) <= counter_price then counter_years := p_years; counter_price := req; end if;
    else
      result := 'rejected';
    end if;
  end if;
  line := public.negotiation_line(p, t, result, counter_price, counter_years, p_role);

  update public.negotiations set
    patience = n.patience,
    status = case result when 'accepted' then 'agreed' when 'walked' then 'walked' else 'open' end,
    offer = jsonb_build_object('years', p_years, 'per_year', p_per_year, 'role', p_role),
    counter = case when result = 'countered' then jsonb_build_object('years', counter_years, 'per_year', counter_price, 'role', p_role) else null end,
    history = history || jsonb_build_array(jsonb_build_object('years', p_years, 'per_year', p_per_year, 'role', p_role, 'result', result, 'line', line, 'at', now())),
    updated_at = now()
  where id = n.id;

  if result = 'accepted' then
    perform public.log_event('deal_agreed', p.id, my_team, format('%s agreed to re-sign: %s yr, %s a year (waiting for approval)', p.name, p_years, public.fmt_k(p_per_year)));
  elsif result = 'walked' then
    perform public.log_event('talks_ended', p.id, my_team, format('%s broke off talks and will test free agency', p.name));
  end if;
  return jsonb_build_object('result', result, 'line', line, 'patience', greatest(n.patience, 0),
    'counter', case when result = 'countered' then jsonb_build_object('years', counter_years, 'per_year', counter_price, 'role', p_role) end);
end $$;

-- Commissioner approves or denies a deal: re-signings and free agency signings.
create or replace function public.review_deal(p_id bigint, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n public.negotiations; p public.players; season int := public.setting_int('current_season'); yrs int; per int; rl text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into n from public.negotiations where id = p_id;
  if n.status is distinct from 'agreed' then raise exception 'That deal isn''t waiting for approval'; end if;
  select * into p from public.players where id = n.player_id;
  yrs := (n.offer->>'years')::int; per := (n.offer->>'per_year')::int; rl := coalesce(n.offer->>'role', 'backup');
  if p_approve and n.kind = 'free_agency' then
    if p.status <> 'free_agent' then raise exception 'He isn''t a free agent anymore'; end if;
    update public.negotiations set status = 'approved', review_note = p_note, updated_at = now() where id = n.id;
    perform public.fa_sign(p.id, n.team_id, yrs, per, rl, 'free_agency');
  elsif p_approve then
    insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source, role)
    values (p.id, n.team_id, season, season + yrs - 1, per, per * yrs, 'resign', rl);
    update public.negotiations set status = 'approved', review_note = p_note, updated_at = now() where id = n.id;
    perform public.place_depth(n.team_id, p.position);
    perform public.log_event('resigned', p.id, n.team_id, format('%s re-signed: %s yr, %s a year', p.name, yrs, public.fmt_k(per)),
      jsonb_build_object('years', yrs, 'per_year', per));
  else
    update public.negotiations set status = 'denied', review_note = p_note, updated_at = now() where id = n.id;
    perform public.log_event('deal_denied', p.id, n.team_id, format('League office denied %s''s %s%s', p.name,
      case when n.kind = 'free_agency' then 'signing. He''s back on the market' else 'new deal' end, coalesce(': ' || p_note, '')));
  end if;
  return jsonb_build_object('approved', p_approve);
end $$;

-- Bot teams re-sign their own players, skipping anyone who wants to test the market.
create or replace function public.bot_resign_all() returns int
language plpgsql security definer set search_path = '' as $$
declare
  tm record; r record; season int := public.setting_int('current_season'); cap int := public.setting_int('cap_limit');
  room int; yrs int; price int; keep boolean; signed int := 0; pl public.players; rl text;
begin
  for tm in select * from public.teams t where public.is_bot_team(t.id) loop
    room := cap - public.team_cap_committed(tm.id);
    for r in
      select p.*, coalesce(pp.potential, p.stars) as pot from public.players p
      left join public.player_potential pp on pp.player_id = p.id
      where p.team_id = tm.id and p.status = 'active'
        and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active')
        and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'walked')
      order by p.stars * 2 + greatest(0, coalesce(pp.potential, p.stars) - p.stars) + (case when p.depth = 'starter' then 1 else 0 end) desc
    loop
      select * into pl from public.players where id = r.id;
      if public.wants_to_test_market(pl) then
        perform public.log_event('talks_ended', pl.id, tm.id, format('%s won''t re-sign. He wants to test free agency.', pl.name));
        continue;
      end if;
      keep := case tm.gm_style
        when 'contender' then r.stars >= 3 or r.depth = 'starter'
        when 'rebuilding' then (r.age <= 24 and r.pot > r.stars) or r.stars >= 4
        else r.stars >= 3.5 or (r.age <= 23 and r.pot > r.stars) or (r.depth = 'starter' and r.stars >= 3) end;
      if not keep then continue; end if;
      yrs := public.preferred_years(pl);
      rl := coalesce(pl.depth, 'backup');
      price := public.required_price(pl, tm.id, yrs, rl);
      if tm.gm_style <> 'contender' and price > public.market_value(pl) * 1.1 then continue; end if;
      if price * yrs > 1000000 or price > room - 100000 then continue; end if;
      insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source, role)
      values (r.id, tm.id, season, season + yrs - 1, price, price * yrs, 'resign', rl);
      perform public.log_event('resigned', r.id, tm.id, format('%s re-signed: %s yr, %s a year', r.name, yrs, public.fmt_k(price)),
        jsonb_build_object('years', yrs, 'per_year', price, 'bot', true));
      room := room - price;
      signed := signed + 1;
    end loop;
  end loop;
  return signed;
end $$;

-- Snapshots now also keep jersey numbers, previous teams and free agency offers.
alter table public.league_snapshots add column fa_offers jsonb not null default '[]';

create or replace function public.take_snapshot(p_label text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid bigint;
begin
  insert into public.league_snapshots (label, settings, players, contracts, negotiations, fa_offers, last_event_id, created_by)
  values (p_label,
    (select jsonb_object_agg(key, value) from public.league_settings),
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'age', age, 'team_id', team_id, 'status', status, 'depth', depth, 'slot', slot,
       'number', number, 'previous_team_id', previous_team_id)), '[]') from public.players),
    (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.contracts c),
    (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.negotiations g),
    (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.fa_offers o),
    coalesce((select max(id) from public.league_events), 0), auth.uid())
  returning id into sid;
  delete from public.league_snapshots where id not in (select id from public.league_snapshots order by id desc limit 20);
  return sid;
end $$;

create or replace function public.undo_last_step() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.league_snapshots;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into s from public.league_snapshots order by id desc limit 1;
  if s.id is null then raise exception 'nothing to undo'; end if;
  delete from public.players where id not in (select x->>'id' from jsonb_array_elements(s.players) x);
  if s.players -> 0 ? 'number' then
    update public.players set number = null where number is not null; -- clear first so restored numbers never collide
  end if;
  update public.players p set age = (x->>'age')::int, team_id = x->>'team_id', status = x->>'status', depth = x->>'depth', slot = (x->>'slot')::int,
    number = case when x ? 'number' then (x->>'number')::int else p.number end,
    previous_team_id = case when x ? 'previous_team_id' then x->>'previous_team_id' else p.previous_team_id end
    from jsonb_array_elements(s.players) x where p.id = x->>'id';
  delete from public.contracts where true;
  insert into public.contracts overriding system value select * from jsonb_populate_recordset(null::public.contracts, s.contracts);
  delete from public.negotiations where true;
  insert into public.negotiations overriding system value select * from jsonb_populate_recordset(null::public.negotiations, s.negotiations);
  delete from public.fa_offers where true;
  insert into public.fa_offers overriding system value select * from jsonb_populate_recordset(null::public.fa_offers, s.fa_offers);
  delete from public.league_events where id > s.last_event_id;
  update public.league_settings ls set value = s.settings -> ls.key where s.settings ? ls.key;
  delete from public.league_snapshots where id = s.id;
  return jsonb_build_object('undone', s.label);
end $$;

revoke execute on function public.bot_resign_all(), public.take_snapshot(text) from public, anon, authenticated;
