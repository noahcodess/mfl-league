-- 057: Morale. Every player has a mood (angry, unhappy, normal, happy, excited) that drifts one step at a time toward
-- what his situation earns: winning vs his age, his role vs what he wants, his favorite team, a Craft Bowl culture, his patience.
-- Angry or unhappy players may ask for a trade (90% / 15% by default, commissioner can change). A request locks him on the
-- trade block. Not traded by the deadline: he's cut. Also the Craft Bowl history table for legacies.

insert into public.league_settings (key, value) values ('trade_request_angry_pct', '90'), ('trade_request_unhappy_pct', '15')
on conflict (key) do nothing;

create table if not exists public.player_morale (
  player_id text primary key references public.players(id) on delete cascade,
  target text, score numeric, reasons jsonb not null default '[]',
  rolled_for text, rolled_season int, mood_since timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.player_morale enable row level security;
drop policy if exists "anyone reads morale" on public.player_morale;
create policy "anyone reads morale" on public.player_morale for select using (true);

create table if not exists public.trade_requests (
  id bigserial primary key,
  player_id text not null references public.players(id) on delete cascade,
  team_id text not null references public.teams(id),
  season int not null, mood text, made_by text not null default 'mood',
  status text not null default 'open' check (status in ('open', 'traded', 'released', 'withdrawn')),
  created_at timestamptz not null default now(), closed_at timestamptz, note text);
create unique index if not exists trade_requests_one_open on public.trade_requests (player_id) where status = 'open';
alter table public.trade_requests enable row level security;
drop policy if exists "anyone reads trade requests" on public.trade_requests;
create policy "anyone reads trade requests" on public.trade_requests for select using (true);

create table if not exists public.craft_bowls (
  id bigserial primary key, season int,
  champion text not null references public.teams(id), runner_up text references public.teams(id),
  champion_coach text, score text, mvp text, note text, created_at timestamptz not null default now());
alter table public.craft_bowls enable row level security;
drop policy if exists "anyone reads craft bowls" on public.craft_bowls;
create policy "anyone reads craft bowls" on public.craft_bowls for select using (true);
insert into public.craft_bowls (season, champion, champion_coach, note)
select null, x.t, x.c, 'Season to be filled in' from (values ('snm', 'Noah'), ('snm', 'Noah'), ('void', null), ('void', null)) x(t, c)
where not exists (select 1 from public.craft_bowls);

-- Is the trade deadline behind us this season? (date on the calendar, or Week 9 reached)
create or replace function public.trade_deadline_passed() returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.league_schedule where season = public.setting_int('current_season') and kind = 'trade_deadline' and starts_at <= now())
    or ((select value #>> '{}' from public.league_settings where key = 'phase') = 'regular_season' and coalesce(public.setting_int('current_week'), 0) >= 9)
$$;

-- How a team looks to its players: strength rank, this season's record, plan, recent Craft Bowls. q runs from -1 (awful) to 1 (great).
create or replace function public.team_morale_ctx(p_team text) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare rk int; w int; l int; q numeric; cs int := public.setting_int('current_season'); titles int; pl text;
begin
  rk := public.team_strength_rank(p_team);
  select count(*) filter (where (home_team = p_team and home_score > away_score) or (away_team = p_team and away_score > home_score)),
         count(*) filter (where (home_team = p_team and home_score < away_score) or (away_team = p_team and away_score < home_score))
    into w, l from public.games where season = cs and kind = 'regular' and status = 'final' and p_team in (home_team, away_team);
  q := (8.5 - rk) / 7.5;
  if w + l >= 3 then q := 0.4 * q + 0.6 * ((w::numeric / (w + l)) - 0.5) * 2; end if;
  select count(*) into titles from public.craft_bowls where champion = p_team and (season is null or season >= cs - 4);
  select plan into pl from public.coaches where team_id = p_team;
  return jsonb_build_object('rank', rk, 'wins', w, 'losses', l, 'q', round(q, 3), 'titles', titles, 'plan', coalesce(pl, 'balanced'));
end $$;

-- The mood a player's situation earns, with the reasons. Each reason: icon, text, v (how much it pushes, + or -).
create or replace function public.mood_calc(p_player text, ctx jsonb) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare p public.players; t public.player_traits; cs int := public.setting_int('current_season');
  q numeric := (ctx->>'q')::numeric; plan text := ctx->>'plan'; rec text; fav boolean; final_year boolean;
  pos numeric := 0.55; neg numeric := 0; w numeric; term numeric; raw numeric; damp numeric; s numeric; md text;
  rs jsonb := '[]';
begin
  select * into p from public.players where id = p_player;
  if p.team_id is null then return null; end if;
  select * into t from public.player_traits where player_id = p_player;
  rec := case when (ctx->>'wins')::int + (ctx->>'losses')::int >= 3 then format('%s-%s', ctx->>'wins', ctx->>'losses') else format('team ranked #%s', ctx->>'rank') end;
  fav := t.favorite_team is not null and t.favorite_team = p.team_id;

  -- Winning. Vets care most; young guys are patient, more so on a real rebuild.
  w := case when coalesce(p.age, 24) <= 22 then 0.35 when p.age <= 24 then 0.6 when p.age = 25 then 0.9 else 1.5 end
     * case t.archetype when 'ring_chaser' then 1.5 when 'mercenary' then 0.6 else 1 end * case when fav then 0.4 else 1 end;
  raw := w * q; term := raw;
  if raw < 0 and coalesce(p.age, 24) <= 24 then
    term := raw * (case when plan = 'rebuild' then 0.3 else 0.5 end);
    if q <= -0.2 then rs := rs || jsonb_build_object('icon', '🌱', 'v', round(term - raw, 2), 'text',
      case when plan = 'rebuild' then 'Trusts the process. Young team on the way up.' else 'Young and patient. Believes this team will get there.' end); end if;
  end if;
  if term >= 0 then pos := pos + term; else neg := neg + term; end if;
  if q >= 0.35 then rs := rs || jsonb_build_object('icon', '🏆', 'v', round(term, 2), 'text', format('Loves playing for a winner (%s)', rec));
  elsif q <= -0.3 and p.age >= 26 then rs := rs || jsonb_build_object('icon', '⏳', 'v', round(term, 2), 'text', format('Running out of time. Wants to win now, not rebuild (%s)', rec));
  elsif q <= -0.3 and t.archetype = 'ring_chaser' then rs := rs || jsonb_build_object('icon', '💍', 'v', round(term, 2), 'text', format('Came here to win rings (%s)', rec));
  elsif q <= -0.3 and term <= -0.25 then rs := rs || jsonb_build_object('icon', '📉', 'v', round(term, 2), 'text', format('Tired of losing (%s)', rec));
  end if;

  -- Role.
  if p.depth = 'starter' then
    pos := pos + 0.25;
    if t.archetype in ('starter_only', 'diva', 'prove_it') then rs := rs || jsonb_build_object('icon', '🏈', 'v', 0.25, 'text', 'Starting, which is all he wants'); end if;
  else
    term := case when t.archetype = 'starter_only' and p.stars >= 2.5 then -1.3
                 when t.archetype = 'diva' and p.stars >= 3.5 then -1.0
                 when t.archetype = 'prove_it' then -0.7
                 when p.stars >= 3.5 then -1.5 * coalesce(t.playing_time, 0.3) else 0 end;
    neg := neg + term;
    if term <= -0.3 then rs := rs || jsonb_build_object('icon', case t.archetype when 'diva' then '💅' when 'prove_it' then '📈' else '🪑' end, 'v', round(term, 2), 'text',
      case t.archetype when 'starter_only' then 'Wants to start. Stuck as a backup.' when 'diva' then 'Thinks he''s too good for the bench'
        when 'prove_it' then 'Wants a real chance to prove himself' else 'Wants more snaps' end); end if;
  end if;

  if fav then pos := pos + 1.1; rs := rs || jsonb_build_object('icon', '🏠', 'v', 1.1, 'text', 'Playing for his favorite team'); end if;

  if (ctx->>'titles')::int > 0 then
    term := round(coalesce(t.legacy, 0.3) * least((ctx->>'titles')::int, 3) * 0.3, 2); pos := pos + term;
    if term >= 0.1 then rs := rs || jsonb_build_object('icon', '🏆', 'v', term, 'text', 'Proud to wear a Craft Bowl champion''s jersey'); end if;
  end if;

  if p.draft_season = cs or p.rookie_season = cs then pos := pos + 0.6; rs := rs || jsonb_build_object('icon', '🎉', 'v', 0.6, 'text', 'Rookie. Just happy to be here.'); end if;

  select exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active' and c.last_season <= cs) into final_year;
  if final_year and coalesce(t.money, 0) >= 0.6 then neg := neg - 0.35; rs := rs || jsonb_build_object('icon', '💰', 'v', -0.35, 'text', 'Final year of his deal and wants a new one'); end if;

  -- Personality softens the bad stuff: patience (2-5) and loyalty.
  damp := (1.25 - 0.08 * coalesce(t.patience, 3.5)) * (1 - 0.25 * coalesce(t.loyalty, 0.5));
  if neg < -0.4 and coalesce(t.loyalty, 0) >= 0.7 then rs := rs || jsonb_build_object('icon', '🤝', 'v', round(neg * damp - neg, 2), 'text', 'Loyal. Willing to ride it out.'); end if;
  neg := neg * damp;

  s := pos + neg + ((abs(hashtext(p.id || ':' || cs)) % 1000) / 999.0 - 0.5) * 0.6;
  md := case when s >= 2.0 then 'excited' when s >= 0.7 then 'happy' when s >= -0.9 then 'normal' when s >= -1.9 then 'unhappy' else 'angry' end;
  return jsonb_build_object('score', round(s, 2), 'mood', md,
    'reasons', coalesce((select jsonb_agg(x order by abs((x->>'v')::numeric) desc) from jsonb_array_elements(rs) x), '[]'));
end $$;

-- One player's target mood (for the player card, always fresh).
create or replace function public.mood_target(p_player text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select public.mood_calc(p.id, public.team_morale_ctx(p.team_id)) from public.players p where p.id = p_player and p.team_id is not null
$$;

-- Open a trade request: locks him on the block, drops untouchable, tells his team and the league.
create or replace function public.open_trade_request(p_player text, p_mood text, p_by text) returns bigint
language plpgsql volatile security definer set search_path to '' as $$
declare pl public.players; tn text; rid bigint; cs int := public.setting_int('current_season');
begin
  select * into pl from public.players where id = p_player;
  if pl.team_id is null or pl.status <> 'active' then raise exception 'He isn''t on a team'; end if;
  if exists (select 1 from public.trade_requests where player_id = p_player and status = 'open') then raise exception '% already asked for a trade', pl.name; end if;
  select name into tn from public.teams where id = pl.team_id;
  insert into public.trade_requests (player_id, team_id, season, mood, made_by) values (pl.id, pl.team_id, cs, p_mood, p_by) returning id into rid;
  delete from public.untouchables where player_id = pl.id;
  insert into public.trade_block (team_id, player_id) values (pl.team_id, pl.id) on conflict (player_id) do update set team_id = excluded.team_id;
  perform public.log_event('trade_request', pl.id, pl.team_id, format('%s %s (%s★) asked the %s for a trade', pl.position, pl.name, pl.stars, tn), jsonb_build_object('request', rid, 'mood', p_mood));
  perform public.notify(pl.team_id, false, false, 'trade_request', format('📣 %s wants out', pl.name),
    format('%s %s asked for a trade. He''s locked on your trade block. Trade him before the trade deadline or he''ll be cut.', pl.position, pl.name),
    jsonb_build_object('player', pl.id, 'request', rid));
  perform public.notify(null, false, true, 'trade_request', format('📣 %s %s (%s★) requested a trade', pl.position, pl.name, pl.stars),
    format('He wants out of the %s. He''s on their trade block now.', tn), jsonb_build_object('player', pl.id, 'team', pl.team_id, 'request', rid));
  return rid;
end $$;

-- Move every mood one step toward its target (p_move), store targets and reasons, roll for trade requests on a new bad mood.
create or replace function public.refresh_morale(p_move boolean) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare tm record; pl record; r jsonb; ctx jsonb; moods text[] := array['angry', 'unhappy', 'normal', 'happy', 'excited'];
  cur int; tgt int; nm text; moved int := 0; reqs int := 0; cs int := public.setting_int('current_season');
  can_req boolean := public.trades_open() and not public.trade_deadline_passed(); has_req boolean; m public.player_morale;
  pa numeric := coalesce(public.setting_int('trade_request_angry_pct'), 90); pu numeric := coalesce(public.setting_int('trade_request_unhappy_pct'), 15);
  dropped text[]; chance numeric;
begin
  for tm in select id from public.teams loop
    ctx := public.team_morale_ctx(tm.id); dropped := '{}';
    for pl in select id, name, position, mood from public.players where team_id = tm.id and status = 'active' loop
      r := public.mood_calc(pl.id, ctx);
      has_req := exists (select 1 from public.trade_requests where player_id = pl.id and status = 'open');
      nm := coalesce(pl.mood, 'normal');
      if p_move then
        cur := array_position(moods, nm); tgt := array_position(moods, r->>'mood');
        if tgt > cur then nm := moods[cur + 1]; elsif tgt < cur then nm := moods[cur - 1]; end if;
        if has_req and array_position(moods, nm) > 2 then nm := 'unhappy'; end if; -- he asked out; he won't be happy until he's moved
      end if;
      insert into public.player_morale (player_id, target, score, reasons, updated_at) values (pl.id, r->>'mood', (r->>'score')::numeric, r->'reasons', now())
      on conflict (player_id) do update set target = excluded.target, score = excluded.score, reasons = excluded.reasons, updated_at = now();
      if nm is distinct from pl.mood then
        update public.players set mood = nm where id = pl.id;
        update public.player_morale set mood_since = now() where player_id = pl.id;
        moved := moved + 1;
        if nm in ('unhappy', 'angry') and array_position(moods, nm) < array_position(moods, coalesce(pl.mood, 'normal')) then
          dropped := array_append(dropped, format('%s %s is now %s', pl.position, pl.name, nm)); end if;
      end if;
      if nm not in ('angry', 'unhappy') then
        update public.player_morale set rolled_for = null where player_id = pl.id and rolled_for is not null;
      elsif p_move and can_req and not has_req then
        select * into m from public.player_morale where player_id = pl.id;
        if m.rolled_for is distinct from nm or m.rolled_season is distinct from cs then
          update public.player_morale set rolled_for = nm, rolled_season = cs where player_id = pl.id;
          chance := (case nm when 'angry' then pa else pu end);
          if random() * 100 < chance then
            perform public.open_trade_request(pl.id, nm, 'mood'); reqs := reqs + 1; end if;
        end if;
      end if;
    end loop;
    if array_length(dropped, 1) > 0 then
      perform public.notify(tm.id, false, false, 'morale', 'Locker room report', array_to_string(dropped, '. ') || '. Check their player cards to see why.', '{}'::jsonb);
    end if;
  end loop;
  if p_move then perform public.log_event('morale', null, null, format('Morale check: %s moods changed, %s trade request%s', moved, reqs, case when reqs = 1 then '' else 's' end),
    jsonb_build_object('moved', moved, 'requests', reqs)); end if;
  return jsonb_build_object('moved', moved, 'requests', reqs);
end $$;

-- At the deadline: anyone who asked out and wasn't traded gets cut. Safe to call any time (does nothing before the deadline).
create or replace function public.trade_request_deadline() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare r record; n int := 0; cs int := public.setting_int('current_season');
begin
  if not public.trade_deadline_passed() then return 0; end if;
  for r in select tr.id, tr.player_id, p.team_id, p.name, p.position, p.stars, t.name tn from public.trade_requests tr
           join public.players p on p.id = tr.player_id left join public.teams t on t.id = p.team_id
           where tr.status = 'open' and tr.season <= cs loop
    if r.team_id is not null then
      update public.contracts set status = 'released' where player_id = r.player_id and status = 'active';
      update public.players set status = 'free_agent', previous_team_id = r.team_id, left_how = 'released', left_season = cs,
        team_id = null, number = null, depth = null, slot = null, mood = 'normal' where id = r.player_id;
      delete from public.trade_block where player_id = r.player_id;
      delete from public.untouchables where player_id = r.player_id;
      perform public.place_depth(r.team_id, r.position);
      insert into public.player_moves (player_id, from_team, to_team, kind, season, note)
      values (r.player_id, r.team_id, null, 'released', cs, 'Cut at the trade deadline after his trade request');
      perform public.log_event('trade_request_cut', r.player_id, r.team_id, format('%s wasn''t traded by the deadline. The %s cut him.', r.name, r.tn));
      perform public.notify(r.team_id, false, false, 'trade_request', format('%s is gone', r.name),
        format('The trade deadline passed, so %s %s was cut. He''s a free agent now.', r.position, r.name), jsonb_build_object('player', r.player_id));
      perform public.notify(null, false, true, 'trade_request', format('✂️ The %s cut %s %s (%s★)', r.tn, r.position, r.name, r.stars),
        'He asked for a trade and nobody got a deal done by the deadline. He''s a free agent.', jsonb_build_object('player', r.player_id));
    end if;
    update public.trade_requests set status = 'released', closed_at = now(), note = 'Not traded by the deadline' where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.commish_trade_request(p_player text) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  return jsonb_build_object('request', public.open_trade_request(p_player, (select mood from public.players where id = p_player), 'commissioner'));
end $$;

create or replace function public.commish_cancel_trade_request(p_id bigint) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare tr public.trade_requests;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.trade_requests set status = 'withdrawn', closed_at = now(), note = 'Called off by the commissioner' where id = p_id and status = 'open' returning * into tr;
  if tr.id is null then raise exception 'That request is already closed'; end if;
  delete from public.trade_block where player_id = tr.player_id;
  update public.player_morale m set rolled_for = p.mood, rolled_season = public.setting_int('current_season') from public.players p where p.id = m.player_id and m.player_id = tr.player_id;
  perform public.notify(tr.team_id, false, false, 'trade_request', 'Trade request called off',
    format('The commissioner called off %s''s trade request. He''s off the trade block.', (select name from public.players where id = tr.player_id)), jsonb_build_object('player', tr.player_id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.commish_save_craft_bowl(p_id bigint, p_season int, p_champion text, p_runner_up text, p_coach text, p_score text, p_mvp text) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare rid bigint;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.teams where id = p_champion) then raise exception 'Pick the champion'; end if;
  if p_runner_up = p_champion then raise exception 'A team can''t beat itself'; end if;
  if p_season is not null and (p_season < 1 or p_season > 99) then raise exception 'Season goes from 1 to 99'; end if;
  if p_id is null then
    insert into public.craft_bowls (season, champion, runner_up, champion_coach, score, mvp)
    values (p_season, p_champion, nullif(p_runner_up, ''), nullif(trim(p_coach), ''), nullif(trim(p_score), ''), nullif(trim(p_mvp), '')) returning id into rid;
  else
    update public.craft_bowls set season = p_season, champion = p_champion, runner_up = nullif(p_runner_up, ''), champion_coach = nullif(trim(p_coach), ''),
      score = nullif(trim(p_score), ''), mvp = nullif(trim(p_mvp), ''), note = null where id = p_id returning id into rid;
    if rid is null then raise exception 'No such Craft Bowl'; end if;
  end if;
  return jsonb_build_object('id', rid);
end $$;

create or replace function public.commish_delete_craft_bowl(p_id bigint) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  delete from public.craft_bowls where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.open_trade_request(text, text, text), public.refresh_morale(boolean), public.trade_request_deadline(), public.mood_calc(text, jsonb) from public, anon, authenticated;
grant execute on function public.mood_target(text), public.team_morale_ctx(text), public.trade_deadline_passed() to anon, authenticated;
grant execute on function public.commish_trade_request(text), public.commish_cancel_trade_request(bigint),
  public.commish_save_craft_bowl(bigint, int, text, text, text, text, text), public.commish_delete_craft_bowl(bigint) to authenticated;
