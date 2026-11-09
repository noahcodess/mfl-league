-- Negotiations: coach offers, player answers (accept / counter / reject / walk), commissioner approves.

create table public.negotiations (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  team_id text not null references public.teams(id) on update cascade,
  season int not null,
  kind text not null default 'resign',
  status text not null default 'open' check (status in ('open', 'agreed', 'walked', 'approved', 'denied')),
  patience int not null,
  ask_per_year int not null,
  ask_years int not null,
  offer jsonb,
  counter jsonb,
  history jsonb not null default '[]',
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index negotiations_live on public.negotiations(player_id) where status in ('open', 'agreed', 'walked');
alter table public.negotiations enable row level security;
create policy "own team, commissioner or site owner reads negotiations" on public.negotiations for select to authenticated using (
  team_id = public.my_team_id() or public.is_commissioner() or public.is_site_owner()
);

-- Cap already committed for the coming season: live deals plus deals agreed and waiting for approval.
create or replace function public.team_cap_committed(p_team text) returns int language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(per_year) from public.contracts where team_id = p_team and status = 'active'
                    and last_season >= public.setting_int('current_season')), 0)
        + coalesce((select sum((offer->>'per_year')::int) from public.negotiations where team_id = p_team and status = 'agreed'), 0))::int
$$;

-- What the player says, by result, tier (star / starter / depth) and what he cares about most.
create or replace function public.negotiation_line(p public.players, t public.player_traits, p_result text, p_counter int, p_years int, p_role text)
returns text language sql stable set search_path = '' as $$
  select case
    when p_result = 'accepted' then case when p.stars >= 4.5 then 'Let''s run it back. I''m in.'
                                         when p.stars >= 3.5 then 'Deal. Let''s get to work.'
                                         else 'Thanks for keeping me around, Coach. I won''t let you down.' end
    when p_result = 'walked' then case when p.stars >= 4.5 then 'We''re done here. Plenty of teams will pay me what I''m worth.'
                                       else 'I think it''s time for a fresh start. See you in free agency.' end
    when p_result = 'countered' then
      case when t.playing_time >= t.money and t.playing_time >= t.legacy and p_role = 'backup'
             then format('Money''s close, but I want to be on the field. %s a year over %s and we''re done.', public.fmt_k(p_counter), p_years)
           when t.legacy >= t.money and t.legacy >= t.playing_time
             then format('I want to win here. Meet me at %s a year for %s and I''ll sign.', public.fmt_k(p_counter), p_years)
           else format('We''re close. Get me to %s a year for %s years and it''s done.', public.fmt_k(p_counter), p_years) end
    else case when p.stars >= 4.5 then 'That''s not a number for a player like me. Try again.'
              when p_counter is null then 'That''s a long way off.'
              else 'That''s a long way off. Come back with a real offer.' end
  end
$$;

-- One round of re-signing talks. Called by the coach of the player's team while the re-signing window is open.
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
      -- He names his number, at whichever length is cheaper for him to accept.
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

-- Commissioner approves (the contract becomes official) or denies (talks can start over).
create or replace function public.review_deal(p_id bigint, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n public.negotiations; p public.players; season int := public.setting_int('current_season'); yrs int; per int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into n from public.negotiations where id = p_id;
  if n.status is distinct from 'agreed' then raise exception 'That deal isn''t waiting for approval'; end if;
  select * into p from public.players where id = n.player_id;
  yrs := (n.offer->>'years')::int; per := (n.offer->>'per_year')::int;
  if p_approve then
    insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source)
    values (p.id, n.team_id, season, season + yrs - 1, per, per * yrs, 'resign');
    update public.players set depth = coalesce(n.offer->>'role', depth) where id = p.id;
    update public.negotiations set status = 'approved', review_note = p_note, updated_at = now() where id = n.id;
    perform public.log_event('resigned', p.id, n.team_id, format('%s re-signed: %s yr, %s a year', p.name, yrs, public.fmt_k(per)),
      jsonb_build_object('years', yrs, 'per_year', per));
  else
    update public.negotiations set status = 'denied', review_note = p_note, updated_at = now() where id = n.id;
    perform public.log_event('deal_denied', p.id, n.team_id, format('League office denied %s''s new deal%s', p.name, coalesce(': ' || p_note, '')));
  end if;
  return jsonb_build_object('approved', p_approve);
end $$;

-- Bot teams re-sign their own players when the window closes, by GM style, within their cap.
create or replace function public.bot_resign_all() returns int
language plpgsql security definer set search_path = '' as $$
declare
  tm record; r record; season int := public.setting_int('current_season'); cap int := public.setting_int('cap_limit');
  room int; yrs int; price int; keep boolean; signed int := 0; pl public.players;
begin
  for tm in select * from public.teams t where not exists (select 1 from public.profiles pr where pr.team_id = t.id and pr.role = 'coach') loop
    room := cap - public.team_cap_committed(tm.id);
    for r in
      select p.*, coalesce(pp.potential, p.stars) as pot from public.players p
      left join public.player_potential pp on pp.player_id = p.id
      where p.team_id = tm.id and p.status = 'active'
        and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active')
        and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'walked')
      order by p.stars * 2 + greatest(0, coalesce(pp.potential, p.stars) - p.stars) + (case when p.depth = 'starter' then 1 else 0 end) desc
    loop
      keep := case tm.gm_style
        when 'contender' then r.stars >= 3 or r.depth = 'starter'
        when 'rebuilding' then (r.age <= 24 and r.pot > r.stars) or r.stars >= 4
        else r.stars >= 3.5 or (r.age <= 23 and r.pot > r.stars) or (r.depth = 'starter' and r.stars >= 3) end;
      if not keep then continue; end if;
      select * into pl from public.players where id = r.id;
      yrs := public.preferred_years(pl);
      price := public.required_price(pl, tm.id, yrs, coalesce(pl.depth, 'backup'));
      if tm.gm_style <> 'contender' and price > public.market_value(pl) * 1.1 then continue; end if;
      if price * yrs > 1000000 or price > room - 100000 then continue; end if;
      insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source)
      values (r.id, tm.id, season, season + yrs - 1, price, price * yrs, 'resign');
      perform public.log_event('resigned', r.id, tm.id, format('%s re-signed: %s yr, %s a year', r.name, yrs, public.fmt_k(price)),
        jsonb_build_object('years', yrs, 'per_year', price, 'bot', true));
      room := room - price;
      signed := signed + 1;
    end loop;
  end loop;
  return signed;
end $$;

-- Quote for the negotiation screen: his ask, preferred length and longest possible deal (own team / commissioner only).
create or replace function public.resign_quote(p_player text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.players;
begin
  select * into p from public.players where id = p_player;
  if p.id is null or not (p.team_id = public.my_team_id() or public.is_commissioner() or public.is_site_owner()) then raise exception 'not allowed'; end if;
  return jsonb_build_object('ask', public.ask_price(p), 'years', public.preferred_years(p), 'max_years', public.max_years(p),
    'market', public.market_value(p), 'cap_room', public.setting_int('cap_limit') - public.team_cap_committed(p.team_id));
end $$;

revoke execute on function public.make_traits(text), public.players_make_traits(), public.bot_resign_all(), public.team_cap_committed(text),
  public.ask_price(public.players), public.required_price(public.players, text, int, text), public.preferred_years(public.players),
  public.max_years(public.players), public.market_value(public.players), public.negotiation_line(public.players, public.player_traits, text, int, int, text)
  from public, anon, authenticated;
revoke execute on function public.negotiate_resign(text, int, int, text), public.review_deal(bigint, boolean, text), public.resign_quote(text) from public, anon;
grant execute on function public.negotiate_resign(text, int, int, text), public.review_deal(bigint, boolean, text), public.resign_quote(text) to authenticated;

-- Re-signing closes: deals waiting for approval must be handled first, and bot teams re-sign before free agency.
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
  elsif step = 3 then -- Re-signing closes: bot teams re-sign, then anyone still unsigned becomes a free agent
    if exists (select 1 from public.negotiations where status = 'agreed') then
      raise exception 'Approve or deny the deals waiting in your inbox first';
    end if;
    perform public.log_event('bots_resigned', null, null, format('Bot teams re-signed %s players', public.bot_resign_all()));
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


-- Snapshots now include negotiations, so undo also rolls back deals.
alter table public.league_snapshots add column negotiations jsonb not null default '[]';

-- Saves everything a step can change. Keeps the 20 most recent.
create or replace function public.take_snapshot(p_label text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare sid bigint;
begin
  insert into public.league_snapshots (label, settings, players, contracts, negotiations, last_event_id, created_by)
  values (p_label,
    (select jsonb_object_agg(key, value) from public.league_settings),
    (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'age', age, 'team_id', team_id, 'status', status, 'depth', depth, 'slot', slot)), '[]') from public.players),
    (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.contracts c),
    (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.negotiations g),
    coalesce((select max(id) from public.league_events), 0), auth.uid())
  returning id into sid;
  delete from public.league_snapshots where id not in (select id from public.league_snapshots order by id desc limit 20);
  return sid;
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
  delete from public.negotiations where true;
  insert into public.negotiations overriding system value select * from jsonb_populate_recordset(null::public.negotiations, s.negotiations);
  delete from public.league_events where id > s.last_event_id;
  update public.league_settings ls set value = s.settings -> ls.key where s.settings ? ls.key;
  delete from public.league_snapshots where id = s.id;
  return jsonb_build_object('undone', s.label);
end $$;

