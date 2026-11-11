-- 046b: bots act. Trade replies on a delay (bot_tick), smart draft picks, coach_brain for profiles, brains for every coach.

create or replace function public.bot_coach_name(p_team text) returns text
language sql stable security definer set search_path to '' as $$
  select 'Coach ' || coalesce((select name from public.coaches where team_id = p_team), 'Bot')
$$;

-- A full bot (not a human team, not a reserved caretaker).
create or replace function public.is_full_bot(p_team text) returns boolean
language sql stable security definer set search_path to '' as $$
  select public.is_bot_team(p_team) and not coalesce((select reserved from public.teams where id = p_team), false)
$$;

-- Answer every bot trade that's due. Safe for anyone to call: it only acts on what's due.
create or replace function public.bot_tick() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare t public.trades; ev jsonb; n int := 0; why text; who text;
begin
  for t in select * from public.trades where status = 'pending' and bot_decide_at is not null and bot_decide_at <= now()
           order by bot_decide_at for update skip locked loop
    if not public.is_full_bot(t.to_team) then
      update public.trades set bot_decide_at = null where id = t.id; continue;
    end if;
    ev := public.bot_eval_trade(t.id); who := public.bot_coach_name(t.to_team);
    update public.trades set bot_verdict = ev, bot_decide_at = null where id = t.id;
    if (ev->>'accept')::boolean then
      begin
        perform public.execute_trade(t.id, 'bot');
        perform public.notify(t.from_team, false, false, 'trade_accepted', format('%s accepted your trade', who),
          (ev->'reasons'->>-1), jsonb_build_object('trade', t.id));
        n := n + 1; continue;
      exception when others then
        why := sqlerrm;
        ev := jsonb_set(ev, '{accept}', 'false');
        ev := jsonb_set(ev, '{reasons}', (ev->'reasons') || to_jsonb(why));
        update public.trades set bot_verdict = ev where id = t.id;
      end;
    end if;
    update public.trades set status = 'declined', decided_at = now(), decided_by = 'bot' where id = t.id;
    perform public.notify(t.from_team, false, false, 'trade_declined', format('%s declined your trade', who),
      (select string_agg(r, ' ') from jsonb_array_elements_text(ev->'reasons') r), jsonb_build_object('trade', t.id));
    perform public.notify(null, true, false, 'trade_declined', format('Bot declined: %s → %s', upper(t.from_team), upper(t.to_team)),
      format('%s said no to %s for %s.', who, public.trade_summary(t.id, 'give'), public.trade_summary(t.id, 'get')), jsonb_build_object('trade', t.id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Commissioner: make the bot answer right now (handy in TEST).
create or replace function public.bot_answer_now(p_trade bigint) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.trades where id = p_trade and status = 'pending') then raise exception 'That trade was already decided'; end if;
  if not public.is_full_bot((select to_team from public.trades where id = p_trade)) then raise exception 'Only full bot teams answer on their own'; end if;
  update public.trades set bot_decide_at = now() where id = p_trade;
  perform public.bot_tick();
  return (select jsonb_build_object('status', status, 'verdict', bot_verdict) from public.trades where id = p_trade);
end $$;

-- Smart draft pick: talent + upside (by mode) + team need, with a little personality noise.
create or replace function public.draft_bot_choice(p_team text, p_season integer) returns text
language plpgsql volatile security definer set search_path to '' as $$
declare sit jsonb := public.bot_situation(p_team); md text; yw numeric; noise numeric;
begin
  md := sit->>'mode';
  yw := case md when 'rebuild' then 0.55 when 'win_now' then 0.2 else 0.35 end;
  noise := case sit #>> '{brain,archetype}' when 'gunslinger' then 0.45 when 'caretaker' then 0.1 else 0.25 end;
  return (select pr.id from public.players pr left join public.player_potential pp on pp.player_id = pr.id
    where pr.status = 'prospect' and pr.draft_season = p_season
      and not exists (select 1 from public.draft_selections s where s.player_id = pr.id and s.status <> 'denied')
    order by (coalesce(pr.stars, 2) + greatest(0, coalesce(pp.potential, pr.stars) - pr.stars) * yw)
             * public.bot_fit(p_team, pr.position) + random() * noise desc
    limit 1);
end $$;

-- Public read for the coach profile: personality + what the coach sees.
create or replace function public.coach_brain(p_team text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select public.bot_situation(p_team) - 'score' || jsonb_build_object(
    'human', not public.is_bot_team(p_team),
    'reserved', coalesce((select reserved from public.teams where id = p_team), false),
    'style', (select gm_style from public.teams where id = p_team))
$$;
grant execute on function public.coach_brain(text) to anon, authenticated;
grant execute on function public.bot_tick() to authenticated;
revoke execute on function public.bot_tick() from anon;

-- Every coach gets a brain (humans too: it powers their Auto pick).
update public.coaches set brain = public.make_bot_brain(team_id) where brain is null;

create or replace function public.ensure_coaches() returns integer
language plpgsql security definer set search_path to '' as $$
declare t record; human boolean; st numeric; n int := 0; nm text;
begin
  for t in select * from public.teams where not exists (select 1 from public.coaches c where c.team_id = teams.id) loop
    human := not public.is_bot_team(t.id);
    st := case when human then 3 else 2 + floor(random() * 6) / 2 end;
    nm := case when human then coalesce((select initcap(coalesce(display_name, username)) from public.profiles where team_id = t.id and role = 'coach' limit 1), public.random_name('USA'))
               else public.random_name('USA') end;
    insert into public.coaches (team_id, name, ratings, potential, brain)
      values (t.id, nm, public.make_coach_ratings(t.id, st), case when human then 5 else st end, public.make_bot_brain(t.id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- propose_trade: full bots answer on their own after a short think; reserved teams stay with the commissioner.
do $do$
declare d text := pg_get_functiondef('public.propose_trade(text,jsonb,jsonb,text)'::regprocedure);
begin
  d := replace(d, '  give := public.trade_summary(tid, ''give''); get := public.trade_summary(tid, ''get'');',
    '  if public.is_full_bot(p_to) then
    update public.trades set bot_decide_at = now() + make_interval(secs => public.setting_int(''bot_reply_min_seconds'')
      + floor(random() * greatest(1, public.setting_int(''bot_reply_max_seconds'') - public.setting_int(''bot_reply_min_seconds''))))
    where id = tid;
  end if;
  give := public.trade_summary(tid, ''give''); get := public.trade_summary(tid, ''get'');');
  d := replace(d, '(Computer team: it can''''t answer until AI coaches are built. You can accept or veto it.)',
    '(Bot team: its coach answers in a few minutes. You can still accept or veto it first.)');
  d := replace(d, 'case when public.is_bot_team(p_to) then', 'case when public.is_full_bot(p_to) then '' (Bot team: its coach answers in a few minutes. You can still accept or veto it first.)'' when public.is_bot_team(p_to) then '' (Reserved team: you answer this one.)'' when false then');
  execute d;
end $do$;
