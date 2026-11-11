-- Trade actions: propose, accept/decline, cancel, commissioner veto/force-accept, untouchables and the trade block.

-- "QB Bojan Petrovic (5★)" / "Season 9 Round 1 pick (DST)"
create or replace function public.trade_item_label(p_player text, p_pick bigint) returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select format('%s %s (%s★)', position, name, stars) from public.players where id = p_player),
    (select format('Season %s Round %s pick (%s)', season, round, upper(original_code)) from public.picks where id = p_pick), '?')
$$;

create or replace function public.trade_summary(p_trade bigint, p_side text) returns text language sql stable security definer set search_path = '' as $$
  select coalesce(string_agg(public.trade_item_label(player_id, pick_id), ', ' order by id), 'nothing') from public.trade_items where trade_id = p_trade and side = p_side
$$;

-- Checks one side's items: right owner, still tradeable, not untouchable (unless the owner is the one offering).
create or replace function public.trade_check_items(p_items jsonb, p_owner text, p_offered_by_owner boolean) returns void
language plpgsql stable security definer set search_path = '' as $$
declare it jsonb; pl public.players;
begin
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    if it ? 'player' then
      select * into pl from public.players where id = it->>'player';
      if pl.id is null or pl.team_id is distinct from p_owner or pl.status <> 'active' then raise exception '% is not on that team anymore', coalesce(pl.name, 'A player'); end if;
      if not p_offered_by_owner and exists (select 1 from public.untouchables u where u.player_id = pl.id) then raise exception '% is untouchable', pl.name; end if;
    elsif it ? 'pick' then
      if not exists (select 1 from public.picks where id = (it->>'pick')::bigint and owner_id = p_owner) then raise exception 'That pick belongs to someone else now'; end if;
      if not public.pick_tradeable((it->>'pick')::bigint) then raise exception '% was already used or is on the clock', public.trade_item_label(null, (it->>'pick')::bigint); end if;
    else raise exception 'Bad trade item'; end if;
  end loop;
end $$;

create or replace function public.propose_trade(p_to text, p_give jsonb, p_get jsonb, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); mx int := public.setting_int('trade_max_items'); tid bigint; it jsonb; give text; get text;
begin
  if me is null then raise exception 'Only a coach can send trades'; end if;
  if not public.trades_open() then raise exception 'Trading is closed right now'; end if;
  if p_to = me or not exists (select 1 from public.teams where id = p_to) then raise exception 'Pick another team'; end if;
  if jsonb_array_length(coalesce(p_give, '[]')) = 0 or jsonb_array_length(coalesce(p_get, '[]')) = 0 then raise exception 'Both sides need at least one player or pick'; end if;
  if jsonb_array_length(p_give) > mx or jsonb_array_length(p_get) > mx then raise exception 'Up to % items a side', mx; end if;
  perform public.trade_check_items(p_give, me, true);
  perform public.trade_check_items(p_get, p_to, false);
  insert into public.trades (season, from_team, to_team, note) values (public.setting_int('current_season'), me, p_to, left(nullif(trim(p_note), ''), 300)) returning id into tid;
  for it in select * from jsonb_array_elements(p_give) loop
    insert into public.trade_items (trade_id, side, player_id, pick_id) values (tid, 'give', it->>'player', (it->>'pick')::bigint);
  end loop;
  for it in select * from jsonb_array_elements(p_get) loop
    insert into public.trade_items (trade_id, side, player_id, pick_id) values (tid, 'get', it->>'player', (it->>'pick')::bigint);
  end loop;
  give := public.trade_summary(tid, 'give'); get := public.trade_summary(tid, 'get');
  perform public.notify(p_to, false, false, 'trade_offer', format('Trade offer from the %s', (select name from public.teams where id = me)),
    format('They send: %s. They want: %s.', give, get), jsonb_build_object('trade', tid));
  perform public.notify(null, true, false, 'trade_offer', format('Trade sent: %s → %s', upper(me), upper(p_to)),
    format('%s offer %s for %s.%s', (select name from public.teams where id = me), give, get,
      case when public.is_bot_team(p_to) then ' (Computer team: it can''t answer until AI coaches are built. You can accept or veto it.)' else '' end),
    jsonb_build_object('trade', tid));
  return jsonb_build_object('trade', tid);
end $$;

-- Moves everything, then checks rosters (45 max) and the cap. Any problem undoes the whole thing.
create or replace function public.execute_trade(p_trade bigint, p_by text) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.trades; it record; newteam text; mx int := public.setting_int('max_roster'); cap int := public.setting_int('cap_limit'); pos text; give text; get text;
begin
  select * into t from public.trades where id = p_trade for update;
  if t.status <> 'pending' then raise exception 'That trade was already decided'; end if;
  if not public.trades_open() and p_by <> 'commissioner' then raise exception 'Trading is closed right now'; end if;
  perform public.trade_check_items((select jsonb_agg(case when player_id is not null then jsonb_build_object('player', player_id) else jsonb_build_object('pick', pick_id) end) from public.trade_items where trade_id = t.id and side = 'give'), t.from_team, true);
  perform public.trade_check_items((select jsonb_agg(case when player_id is not null then jsonb_build_object('player', player_id) else jsonb_build_object('pick', pick_id) end) from public.trade_items where trade_id = t.id and side = 'get'), t.to_team, true);
  for it in select * from public.trade_items where trade_id = t.id loop
    newteam := case when it.side = 'give' then t.to_team else t.from_team end;
    if it.player_id is not null then
      delete from public.untouchables where player_id = it.player_id;
      delete from public.trade_block where player_id = it.player_id;
      update public.contracts set team_id = newteam where player_id = it.player_id and status = 'active';
      update public.players set previous_team_id = team_id where id = it.player_id;
      perform public.join_team(it.player_id, newteam);
    else
      update public.picks set owner_id = newteam where id = it.pick_id;
    end if;
  end loop;
  for pos in select distinct p.position from public.trade_items i join public.players p on p.id = i.player_id where i.trade_id = t.id loop
    perform public.place_depth(t.from_team, pos); perform public.place_depth(t.to_team, pos);
  end loop;
  if public.team_roster_count(t.from_team) > mx or public.team_roster_count(t.to_team) > mx then raise exception 'That trade puts a team over the % man roster limit', mx; end if;
  if public.team_cap_committed(t.from_team) > cap then raise exception 'That trade puts the % over the salary cap', (select name from public.teams where id = t.from_team); end if;
  if public.team_cap_committed(t.to_team) > cap then raise exception 'That trade puts the % over the salary cap', (select name from public.teams where id = t.to_team); end if;
  update public.trades set status = 'accepted', decided_at = now(), decided_by = p_by where id = t.id;
  -- Any other open offer that included something that just moved is off.
  update public.trades o set status = 'expired', decided_at = now(), decided_by = 'system' where o.status = 'pending' and o.id <> t.id
    and exists (select 1 from public.trade_items a join public.trade_items b on (a.player_id = b.player_id or a.pick_id = b.pick_id) where a.trade_id = o.id and b.trade_id = t.id);
  give := public.trade_summary(t.id, 'give'); get := public.trade_summary(t.id, 'get');
  perform public.log_event('trade', null, t.from_team, format('TRADE: %s send %s to the %s for %s', (select name from public.teams where id = t.from_team), give,
    (select name from public.teams where id = t.to_team), get), jsonb_build_object('trade', t.id, 'to', t.to_team, 'by', p_by));
  perform public.notify(null, false, true, 'trade_done', format('Trade: %s ⇄ %s', upper(t.from_team), upper(t.to_team)),
    format('%s get %s. %s get %s.', (select name from public.teams where id = t.to_team), give, (select name from public.teams where id = t.from_team), get), jsonb_build_object('trade', t.id));
end $$;

create or replace function public.respond_trade(p_trade bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.trades;
begin
  select * into t from public.trades where id = p_trade;
  if t.id is null or t.to_team is distinct from public.my_team_id() then raise exception 'That trade isn''t yours to answer'; end if;
  if t.status <> 'pending' then raise exception 'That trade was already decided'; end if;
  if p_accept then perform public.execute_trade(t.id, 'coach'); return jsonb_build_object('accepted', true); end if;
  update public.trades set status = 'declined', decided_at = now(), decided_by = 'coach' where id = t.id;
  perform public.notify(t.from_team, false, false, 'trade_declined', format('The %s declined your trade', (select name from public.teams where id = t.to_team)),
    format('You offered %s for %s.', public.trade_summary(t.id, 'give'), public.trade_summary(t.id, 'get')), jsonb_build_object('trade', t.id));
  return jsonb_build_object('accepted', false);
end $$;

create or replace function public.cancel_trade(p_trade bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.trades set status = 'cancelled', decided_at = now(), decided_by = 'coach'
  where id = p_trade and from_team = public.my_team_id() and status = 'pending';
  if not found then raise exception 'You can only cancel your own open trades'; end if;
  return jsonb_build_object('cancelled', p_trade);
end $$;

-- Commissioner: veto any open trade, or accept one for the other side (computer teams until AI coaches exist).
create or replace function public.commish_trade(p_trade bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.trades;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into t from public.trades where id = p_trade;
  if t.status is distinct from 'pending' then raise exception 'That trade was already decided'; end if;
  if p_accept then perform public.execute_trade(t.id, 'commissioner'); return jsonb_build_object('accepted', true); end if;
  update public.trades set status = 'vetoed', decided_at = now(), decided_by = 'commissioner' where id = t.id;
  perform public.notify(t.from_team, false, false, 'trade_vetoed', 'The commissioner vetoed your trade', format('%s for %s.', public.trade_summary(t.id, 'give'), public.trade_summary(t.id, 'get')), jsonb_build_object('trade', t.id));
  perform public.notify(t.to_team, false, false, 'trade_vetoed', 'The commissioner vetoed a trade offer to you', format('%s for %s.', public.trade_summary(t.id, 'give'), public.trade_summary(t.id, 'get')), jsonb_build_object('trade', t.id));
  return jsonb_build_object('vetoed', true);
end $$;

-- Up to 2 untouchables per team: other teams can't ask for them (you can still offer them yourself).
create or replace function public.toggle_untouchable(p_player text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id();
begin
  if me is null or not exists (select 1 from public.players where id = p_player and team_id = me) then raise exception 'Only his coach can do that'; end if;
  if exists (select 1 from public.untouchables where player_id = p_player) then delete from public.untouchables where player_id = p_player; return false; end if;
  if (select count(*) from public.untouchables where team_id = me) >= public.setting_int('untouchable_max') then
    raise exception 'You can only have % untouchables', public.setting_int('untouchable_max');
  end if;
  insert into public.untouchables (team_id, player_id) values (me, p_player);
  return true;
end $$;

-- The trade block. Putting a 3.5★+ player on it tells the whole league.
create or replace function public.toggle_trade_block(p_player text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); pl public.players;
begin
  select * into pl from public.players where id = p_player;
  if me is null or pl.team_id is distinct from me then raise exception 'Only his coach can do that'; end if;
  if exists (select 1 from public.trade_block where player_id = p_player) then delete from public.trade_block where player_id = p_player; return false; end if;
  insert into public.trade_block (team_id, player_id) values (me, p_player);
  if pl.stars >= (select (value #>> '{}')::numeric from public.league_settings where key = 'trade_block_alert_stars') then
    perform public.notify(null, false, true, 'trade_block', format('On the block: %s %s (%s★)', pl.position, pl.name, pl.stars),
      format('The %s are listening to offers.', (select name from public.teams where id = me)), jsonb_build_object('player', pl.id, 'team', me));
  end if;
  return true;
end $$;

revoke execute on function public.trade_item_label(text, bigint), public.trade_summary(bigint, text), public.trade_check_items(jsonb, text, boolean), public.execute_trade(bigint, text) from public, anon, authenticated;
revoke execute on function public.propose_trade(text, jsonb, jsonb, text), public.respond_trade(bigint, boolean), public.cancel_trade(bigint), public.commish_trade(bigint, boolean),
  public.toggle_untouchable(text), public.toggle_trade_block(text) from public, anon;
grant execute on function public.propose_trade(text, jsonb, jsonb, text), public.respond_trade(bigint, boolean), public.cancel_trade(bigint), public.commish_trade(bigint, boolean),
  public.toggle_untouchable(text), public.toggle_trade_block(text) to authenticated;
