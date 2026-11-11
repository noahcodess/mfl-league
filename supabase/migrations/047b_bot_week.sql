-- 047b: the weekly bot run. Bots refresh their trade blocks, rarely trade with each other, rarely offer for a human's
-- block player, and (in season) sign free agents to fill holes. Runs on its own once a week from bot_tick.

-- Bots decide who's available: rebuilders shop vets (26+, 3.5★+), contenders shop a good backup, others a spare part.
create or replace function public.bot_refresh_blocks() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare tm record; before text[]; fresh text; n int := 0; lim int; alert numeric := coalesce((select (value #>> '{}')::numeric from public.league_settings where key = 'trade_block_alert_stars'), 3.5);
begin
  select coalesce(array_agg(player_id), '{}') into before from public.trade_block;
  for tm in select c.team_id, c.plan, c.brain from public.coaches c where public.is_full_bot(c.team_id) loop
    delete from public.trade_block where team_id = tm.team_id;
    lim := case when tm.brain->>'archetype' = 'dealmaker' then 1 else 0 end;
    insert into public.trade_block (team_id, player_id)
    select tm.team_id, p.id from public.players p
    where p.team_id = tm.team_id and p.status = 'active'
      and not exists (select 1 from public.untouchables u where u.player_id = p.id)
      and case tm.plan
        when 'rebuild' then p.age >= 26 and p.stars >= 3.5
        when 'win_now' then p.depth = 'backup' and p.stars >= 3.5
        else p.depth = 'backup' and p.stars >= 3 and public.bot_fit(tm.team_id, p.position) <= 0.9 end
    order by p.stars desc, p.age desc
    limit case tm.plan when 'rebuild' then 2 else 1 end + lim;
  end loop;
  select string_agg(format('%s %s (%s★, %s)', p.position, p.name, p.stars, upper(b.team_id)), ', '), count(*)
    into fresh, n from public.trade_block b join public.players p on p.id = b.player_id
    where public.is_full_bot(b.team_id) and not (b.player_id = any(before)) and p.stars >= alert;
  if n > 0 then
    perform public.notify(null, false, true, 'trade_block', format('Bots put %s player%s on the trade block', n, case when n = 1 then '' else 's' end),
      fresh || '.', '{}'::jsonb);
  end if;
  return (select count(*) from public.trade_block where public.is_full_bot(team_id))::int;
end $$;

-- How a buying bot sees one pick vs one player (its own values, no edge).
create or replace function public.bot_buyer_ok(p_buyer text, p_player text, p_pick bigint) returns boolean
language sql stable security definer set search_path to '' as $$
  with s as (select public.bot_brain(p_buyer) br, coalesce((select plan from public.coaches where team_id = p_buyer), 'balanced') md)
  select public.bot_player_value(p_player, p_buyer, s.md, s.br, false) >= public.bot_pick_value(p_pick, p_buyer, s.md, s.br) from s
$$;

-- Rare bot-to-bot deal: a seller's block player goes to the bot that needs him most, for the cheapest pick the seller takes.
create or replace function public.bot_league_trades() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare s record; b record; k record; tid bigint; ev jsonb; nd int := public.next_draft_season(); made int := 0;
begin
  if not public.trades_open() then return 0; end if;
  <<sellers>>
  for s in select tb.player_id, tb.team_id seller, p.position, p.age, (c.brain->>'aggression')::int aggr
           from public.trade_block tb join public.players p on p.id = tb.player_id join public.coaches c on c.team_id = tb.team_id
           where public.is_full_bot(tb.team_id) and p.stars >= 3.5 order by random() loop
    continue when random() > 0.12 + 0.04 * s.aggr;
    for b in select c.team_id from public.coaches c
             where public.is_full_bot(c.team_id) and c.team_id <> s.seller
               and (c.plan = 'win_now' or (c.plan = 'balanced' and s.age <= 25))
               and public.bot_fit(c.team_id, s.position) >= 1.0
             order by public.bot_fit(c.team_id, s.position) desc, random() limit 3 loop
      for k in select id from public.picks where owner_id = b.team_id and season between nd and nd + 1 and public.pick_tradeable(id)
               order by round desc, season desc loop
        continue when not public.bot_buyer_ok(b.team_id, s.player_id, k.id);
        insert into public.trades (season, from_team, to_team, note) values (public.setting_int('current_season'), b.team_id, s.seller, 'Bot trade') returning id into tid;
        insert into public.trade_items (trade_id, side, pick_id) values (tid, 'give', k.id);
        insert into public.trade_items (trade_id, side, player_id) values (tid, 'get', s.player_id);
        ev := public.bot_eval_trade(tid);
        if (ev->>'accept')::boolean then
          begin
            update public.trades set bot_verdict = ev where id = tid;
            perform public.execute_trade(tid, 'bot');
            made := made + 1;
            exit sellers;
          exception when others then null;
          end;
        end if;
        delete from public.trade_items where trade_id = tid;
        delete from public.trades where id = tid;
      end loop;
    end loop;
  end loop;
  return made;
end $$;

-- Rare offer to a human: a bot that really needs a human's block player offers a fair-ish pick for him.
create or replace function public.bot_human_offers() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare h record; b record; k record; tid bigint; nd int := public.next_draft_season(); made int := 0; who text;
begin
  if not public.trades_open() then return 0; end if;
  for h in select tb.player_id, tb.team_id, p.position, p.age, p.name, p.stars from public.trade_block tb join public.players p on p.id = tb.player_id
           where not public.is_bot_team(tb.team_id) order by random() loop
    exit when made >= 2;
    continue when exists (select 1 from public.trades t join public.trade_items i on i.trade_id = t.id
                          where t.status = 'pending' and t.to_team = h.team_id and i.player_id = h.player_id and public.is_bot_team(t.from_team));
    continue when random() > 0.4;
    select c.team_id, c.plan, c.brain into b from public.coaches c
      where public.is_full_bot(c.team_id) and (c.plan <> 'rebuild' or h.age <= 24) and public.bot_fit(c.team_id, h.position) >= 1.05
      order by public.bot_fit(c.team_id, h.position) desc, random() limit 1;
    continue when b.team_id is null;
    select x.id into k from (select id, public.bot_pick_value(id, b.team_id, b.plan, b.brain) v from public.picks
        where owner_id = b.team_id and season between nd and nd + 1 and public.pick_tradeable(id)) x
      where x.v <= public.bot_player_value(h.player_id, b.team_id, b.plan, b.brain, false) * 0.95
      order by x.v desc limit 1;
    continue when k.id is null;
    who := public.bot_coach_name(b.team_id);
    insert into public.trades (season, from_team, to_team, note) values (public.setting_int('current_season'), b.team_id, h.team_id,
      format('%s: We need a %s and saw %s on the block. Fair price?', who, h.position, h.name)) returning id into tid;
    insert into public.trade_items (trade_id, side, pick_id) values (tid, 'give', k.id);
    insert into public.trade_items (trade_id, side, player_id) values (tid, 'get', h.player_id);
    perform public.notify(h.team_id, false, false, 'trade_offer', format('Trade offer from the %s', (select name from public.teams where id = b.team_id)),
      format('They send: %s. They want: %s.', public.trade_summary(tid, 'give'), public.trade_summary(tid, 'get')), jsonb_build_object('trade', tid));
    perform public.notify(null, true, false, 'trade_offer', format('Bot offer: %s → %s', upper(b.team_id), upper(h.team_id)),
      format('%s offered %s for %s.', who, public.trade_summary(tid, 'give'), public.trade_summary(tid, 'get')), jsonb_build_object('trade', tid));
    made := made + 1;
  end loop;
  return made;
end $$;

-- One bot week. In season, bots also sign free agents to fill holes.
create or replace function public.bot_weekly() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare filled int := 0; blocks int := 0; deals int := 0; offers int := 0; in_season boolean;
begin
  perform public.bot_refresh_modes();
  in_season := (select value #>> '{}' from public.league_settings where key = 'phase') = 'regular_season';
  if in_season then filled := public.bot_fill_rosters(); end if;
  if public.trades_open() then
    blocks := public.bot_refresh_blocks();
    deals := public.bot_league_trades();
    offers := public.bot_human_offers();
  end if;
  update public.league_settings set value = to_jsonb(now()::text) where key = 'bot_week_last';
  perform public.log_event('bot_week', null, null, format('Bot week: %s on the block, %s bot trade%s, %s offer%s to coaches, %s free agents signed',
    blocks, deals, case when deals = 1 then '' else 's' end, offers, case when offers = 1 then '' else 's' end, filled),
    jsonb_build_object('blocks', blocks, 'deals', deals, 'offers', offers, 'filled', filled));
  return jsonb_build_object('blocks', blocks, 'deals', deals, 'offers', offers, 'filled', filled);
end $$;

create or replace function public.bot_run_week() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  return public.bot_weekly();
end $$;

-- bot_tick also runs the bot week once 7 days have passed.
do $do$
declare d text := pg_get_functiondef('public.bot_tick()'::regprocedure);
begin
  d := replace(d, '  return n;
end', '  if coalesce((select (value #>> ''{}'')::timestamptz from public.league_settings where key = ''bot_week_last''), now() - interval ''8 days'') < now() - interval ''7 days'' then
    perform public.bot_weekly();
  end if;
  return n;
end');
  if d not like '%bot_weekly%' then raise exception 'tick patch failed'; end if;
  execute d;
end $do$;

-- Offseason hooks: fresh plans after birthdays, and a bot week right when trading opens (after re-signing).
do $do$
declare d text := pg_get_functiondef('public.advance_offseason()'::regprocedure);
begin
  d := replace(d, '  elsif step = 1 then', '    perform public.bot_refresh_modes();
  elsif step = 1 then');
  d := replace(d, '      (select count(*) from public.players where status = ''free_agent'')));
  elsif step = 3 then', '      (select count(*) from public.players where status = ''free_agent'')));
    perform public.bot_weekly();
  elsif step = 3 then');
  if d not like '%bot_weekly%' or d not like '%bot_refresh_modes%' then raise exception 'advance patch failed'; end if;
  execute d;
end $do$;
