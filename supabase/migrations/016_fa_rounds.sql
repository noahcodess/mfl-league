-- Free agency rounds: bot GMs bid by need and style, then every free agent with offers decides. Bot signings are
-- instant; a coach's signing waits for the commissioner like a re-signing does. Also: topping up the free agent
-- pool with street players, and bots filling their rosters when free agency closes.

-- Signs a free agent to a team right now: contract (with the promised role), roster spot, number, depth chart.
create or replace function public.fa_sign(p_player text, p_team text, p_years int, p_per_year int, p_role text, p_source text) returns void
language plpgsql security definer set search_path = '' as $$
declare season int := public.setting_int('current_season'); nm text;
begin
  insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source, role)
  values (p_player, p_team, season, season + p_years - 1, p_per_year, p_per_year * p_years, p_source, p_role);
  perform public.join_team(p_player, p_team);
  select name into nm from public.players where id = p_player;
  perform public.log_event('signed', p_player, p_team, format('%s signed with %s: %s yr, %s a year',
    nm, (select name from public.teams where id = p_team), p_years, public.fmt_k(p_per_year)),
    jsonb_build_object('years', p_years, 'per_year', p_per_year, 'role', p_role, 'bot', public.is_bot_team(p_team)));
end $$;

-- Each bot team bids on free agents for the spots it still needs, by GM style, within its cap.
create or replace function public.bot_fa_offers() returns int
language plpgsql security definer set search_path = '' as $$
declare
  tm record; rt record; fid text; pl public.players;
  cap int := public.setting_int('cap_limit'); max_roster int := public.setting_int('max_roster');
  max_offers int := public.setting_int('max_open_offers'); rnd int := public.setting_int('fa_round') + 1;
  room int; spots int; have int; need int; role text; yrs int; price int; made int := 0; team_made int; factor numeric;
begin
  for tm in select * from public.teams t where public.is_bot_team(t.id) order by random() loop
    room := cap - public.team_cap_committed(tm.id) - coalesce((select sum(per_year) from public.fa_offers where team_id = tm.id and status = 'open'), 0);
    spots := max_roster - public.team_roster_count(tm.id) - (select count(*) from public.fa_offers where team_id = tm.id and status = 'open');
    team_made := (select count(*) from public.fa_offers where team_id = tm.id and status = 'open');
    -- Positions with the biggest starter holes first.
    for rt in select r.*, (select count(*) from public.players x where x.team_id = tm.id and x.position = r.position and x.status = 'active')
                 + (select count(*) from public.fa_offers o join public.players x on x.id = o.player_id
                    where o.team_id = tm.id and o.status = 'open' and x.position = r.position) as have
              from public.roster_template r order by (r.starters - (select count(*) from public.players x where x.team_id = tm.id
                 and x.position = r.position and x.status = 'active')) desc, random() loop
      have := rt.have;
      need := rt.starters + rt.backups - have;
      continue when need <= 0;
      role := case when have < rt.starters then 'starter' else 'backup' end;
      exit when spots <= 0 or team_made >= max_offers or room < 60000;
      -- Best fit at the position that this team hasn't bid on and nobody has locked up.
      fid := null;
      select p.id into fid from public.players p left join public.player_potential pp on pp.player_id = p.id
        where p.status = 'free_agent' and p.position = rt.position
          and not exists (select 1 from public.fa_offers o where o.player_id = p.id and o.team_id = tm.id and o.status = 'open')
          and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'agreed')
        order by case tm.gm_style
          when 'contender' then p.stars * 2
          when 'rebuilding' then p.stars + coalesce(pp.potential, p.stars) * 1.2 - p.age * 0.1
          else p.stars * 1.6 + (coalesce(pp.potential, p.stars) - p.stars) * 0.6 end
          + (case when role = 'backup' then -abs(p.stars - 2.5) * 0.5 else 0 end) + random() * 0.6 desc
        limit 1;
      continue when fid is null;
      select * into pl from public.players where id = fid;
      yrs := public.preferred_years(pl);
      factor := case tm.gm_style when 'contender' then 0.95 + random() * 0.2 when 'rebuilding' then 0.8 + random() * 0.18 else 0.88 + random() * 0.17 end;
      price := greatest(10000, public.round5k(public.required_price(pl, tm.id, yrs, role) * factor));
      if price * yrs > 1000000 then yrs := greatest(1, 1000000 / price); end if;
      continue when price > room - 40000 * greatest(spots - 1, 0) / 4 or price * yrs > 1000000;
      insert into public.fa_offers (player_id, team_id, season, round, years, per_year, role)
      values (pl.id, tm.id, public.setting_int('current_season'), rnd, yrs, price, role);
      room := room - price; spots := spots - 1; team_made := team_made + 1; made := made + 1;
    end loop;
  end loop;
  return made;
end $$;

-- One round of free agency (commissioner): bots bid, then each free agent with offers, best players first, takes
-- the best offer he'll accept. Snapshot first, so the round can be undone.
create or replace function public.run_fa_round() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  rnd int := public.setting_int('fa_round') + 1; rounds int := public.setting_int('fa_rounds');
  cap int := public.setting_int('cap_limit'); max_roster int := public.setting_int('max_roster');
  desp numeric := public.fa_desperation(public.setting_int('fa_round') + 1);
  f record; ofr record; pl public.players; t public.player_traits; bids int; holdouts int := 0; bot_signed int := 0;
  agreed int := 0; no_deal int := 0; won boolean;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not public.fa_open() then raise exception 'Free agency isn''t open right now'; end if;
  if rnd > rounds then raise exception 'All % rounds are done. Move on to the Draft when you''re ready.', rounds; end if;
  perform public.take_snapshot(format('Before free agency round %s', rnd));
  bids := public.bot_fa_offers();

  for f in select p.id from public.players p left join public.player_potential pp on pp.player_id = p.id
           where p.status = 'free_agent' and exists (select 1 from public.fa_offers o where o.player_id = p.id and o.status = 'open')
             and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'agreed')
           order by p.stars desc, coalesce(pp.potential, p.stars) desc, random() loop
    select * into pl from public.players where id = f.id;
    select * into t from public.player_traits where player_id = pl.id;
    won := false;
    for ofr in select x.*, x.per_year::numeric / nullif(public.required_price(pl, x.team_id, x.years, x.role) * desp, 0) as score
             from public.fa_offers x where x.player_id = pl.id and x.status = 'open' order by score desc nulls last, random() loop
      exit when coalesce(ofr.score, 0) < 1;
      -- Round 1: a patient star waits to see if the market goes higher, unless someone blows him away.
      if rnd = 1 and pl.stars >= 4 and t.patience >= 3 and ofr.score < 1.15 then
        holdouts := holdouts + 1;
        perform public.log_event('fa_holdout', pl.id, null, format('%s is waiting to see what else is out there', pl.name));
        exit;
      end if;
      continue when public.team_cap_committed(ofr.team_id) + ofr.per_year > cap or public.team_roster_count(ofr.team_id) >= max_roster;
      update public.fa_offers set status = case when id = ofr.id then 'won' else 'lost' end where player_id = pl.id and status = 'open';
      if public.is_bot_team(ofr.team_id) then
        perform public.fa_sign(pl.id, ofr.team_id, ofr.years, ofr.per_year, ofr.role, 'free_agency');
        bot_signed := bot_signed + 1;
      else
        insert into public.negotiations (player_id, team_id, season, kind, status, patience, ask_per_year, ask_years, offer, history)
        values (pl.id, ofr.team_id, public.setting_int('current_season'), 'free_agency', 'agreed', coalesce(t.patience, 3),
                public.ask_price(pl), public.preferred_years(pl), jsonb_build_object('years', ofr.years, 'per_year', ofr.per_year, 'role', ofr.role),
                jsonb_build_array(jsonb_build_object('years', ofr.years, 'per_year', ofr.per_year, 'role', ofr.role, 'result', 'accepted', 'round', rnd, 'at', now())));
        perform public.log_event('deal_agreed', pl.id, ofr.team_id, format('%s picked %s in free agency: %s yr, %s a year (waiting for approval)',
          pl.name, (select name from public.teams where id = ofr.team_id), ofr.years, public.fmt_k(ofr.per_year)));
        agreed := agreed + 1;
      end if;
      won := true;
      exit;
    end loop;
    if not won then no_deal := no_deal + 1; end if;
  end loop;

  update public.league_settings set value = to_jsonb(rnd) where key = 'fa_round';
  perform public.log_event('fa_round', null, null, format('Free agency round %s: %s signed with bot teams, %s deals waiting for approval, %s still unsigned with offers',
    rnd, bot_signed, agreed, no_deal), jsonb_build_object('round', rnd, 'bot_bids', bids, 'bot_signed', bot_signed, 'agreed', agreed, 'holdouts', holdouts, 'no_deal', no_deal));
  return jsonb_build_object('round', rnd, 'rounds', rounds, 'bot_bids', bids, 'bot_signed', bot_signed, 'agreed', agreed, 'holdouts', holdouts, 'no_deal', no_deal);
end $$;

-- Free agency closes: bot teams fill any spot still empty with the best cheap free agent they can afford.
create or replace function public.bot_fill_rosters() returns int
language plpgsql security definer set search_path = '' as $$
declare tm record; rt record; pl public.players; cap int := public.setting_int('cap_limit'); have int; price int; made int := 0; role text;
begin
  for tm in select * from public.teams t where public.is_bot_team(t.id) loop
    for rt in select * from public.roster_template loop
      loop
        have := (select count(*) from public.players x where x.team_id = tm.id and x.position = rt.position and x.status = 'active');
        exit when have >= rt.starters + rt.backups or public.team_roster_count(tm.id) >= public.setting_int('max_roster');
        role := case when have < rt.starters then 'starter' else 'backup' end;
        select p.* into pl from public.players p where p.status = 'free_agent' and p.position = rt.position
          and not exists (select 1 from public.negotiations g where g.player_id = p.id and g.status = 'agreed')
          and public.round5k(public.ask_price(p) * 0.7) <= cap - public.team_cap_committed(tm.id)
          order by p.stars desc, random() limit 1;
        exit when pl.id is null;
        price := greatest(10000, public.round5k(public.ask_price(pl) * 0.7)); -- leftovers take what they can get
        perform public.fa_sign(pl.id, tm.id, 1, price, role, 'free_agency');
        made := made + 1;
      end loop;
    end loop;
  end loop;
  return made;
end $$;

-- Makes sure there are always enough free agents: enough to fill every open roster spot about 1.3 times over.
create or replace function public.top_up_free_agents() returns int
language plpgsql security definer set search_path = '' as $$
declare open_spots int; pool int; want int;
begin
  select coalesce(sum(greatest(0, (select sum(starters + backups) from public.roster_template) - public.team_roster_count(t.id))), 0)
    into open_spots from public.teams t;
  pool := (select count(*) from public.players where status = 'free_agent');
  want := greatest(0, ceil(open_spots * 1.3)::int + 15 - pool);
  if want > 0 then perform public.generate_free_agents(want); end if;
  return want;
end $$;

revoke execute on function public.fa_sign(text, text, int, int, text, text), public.bot_fa_offers(), public.bot_fill_rosters(),
  public.top_up_free_agents() from public, anon, authenticated;
revoke execute on function public.run_fa_round() from public, anon;
grant execute on function public.run_fa_round() to authenticated;
