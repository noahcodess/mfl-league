-- Draft room buttons: start, coach picks, approve/deny, pause, sim to the end, and the tick every screen sends to keep it moving.

create or replace function public.draft_start() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season');
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'offseason' or public.setting_int('offseason_step') <> 3 then
    raise exception 'The draft happens after free agency (the Draft step is next)';
  end if;
  if public.setting_int('fa_round') < public.setting_int('fa_rounds') then
    raise exception 'Finish free agency first (% of % rounds done)', public.setting_int('fa_round'), public.setting_int('fa_rounds');
  end if;
  if exists (select 1 from public.draft_room where draft_room.season = v_season) then raise exception 'The draft already started'; end if;
  if not exists (select 1 from public.draft_slots(v_season)) then raise exception 'The draft order is not set'; end if;
  perform public.take_snapshot(format('Before the Season %s draft', v_season));
  insert into public.draft_room (season) values (v_season);
  perform public.draft_set_clock(v_season, 10);
  perform public.log_event('draft_start', null, null, format('The Season %s draft is underway', v_season));
  return jsonb_build_object('season', v_season);
end $$;

-- Every open draft screen calls this every couple of seconds. It only acts when the clock says so, so extra calls are harmless.
create or replace function public.draft_tick() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; p public.draft_selections; owner text;
begin
  select * into r from public.draft_room where draft_room.season = v_season for update skip locked;
  if r.season is null or r.status <> 'live' then return jsonb_build_object('acted', false); end if;
  select * into p from public.draft_selections s where s.season = r.season and s.status = 'pending' limit 1;
  if p.id is not null then
    if p.created_at < now() - make_interval(secs => public.setting_int('draft_auto_approve_seconds')) then
      perform public.draft_finalize(p.id); perform public.draft_next(r.season);
      return jsonb_build_object('acted', true, 'auto_approved', p.id);
    end if;
    return jsonb_build_object('acted', false);
  end if;
  if r.clock_ends_at is null or now() < r.clock_ends_at then return jsonb_build_object('acted', false); end if;
  select team_id into owner from public.draft_slots(r.season) where pick_no = r.pick_no;
  perform public.draft_auto_pick(r.season, case when public.is_bot_team(owner) then 'bot' else 'auto' end);
  return jsonb_build_object('acted', true);
end $$;

-- A coach turns in his pick. It waits for the commissioner (or goes through on its own after a couple of minutes).
create or replace function public.draft_make_pick(p_player text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; sl record; my_team text := public.my_team_id(); sid bigint;
begin
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null or r.status = 'done' then raise exception 'The draft is not on'; end if;
  if r.status = 'paused' then raise exception 'The draft is paused'; end if;
  select * into sl from public.draft_slots(v_season) where pick_no = r.pick_no;
  if my_team is null or sl.team_id <> my_team then raise exception 'You are not on the clock'; end if;
  if exists (select 1 from public.draft_selections s where s.season = r.season and s.status = 'pending') then raise exception 'Your pick is already in'; end if;
  if not exists (select 1 from public.players where id = p_player and status = 'prospect' and draft_season = v_season)
     or exists (select 1 from public.draft_selections s where s.player_id = p_player and s.status <> 'denied') then
    raise exception 'That player is already off the board';
  end if;
  insert into public.draft_selections (season, pick_no, round, slot, team_id, original_team_id, player_id, status, how)
  values (v_season, r.pick_no, sl.round, sl.slot, sl.team_id, sl.original_team_id, p_player, 'pending', 'coach') returning id into sid;
  update public.draft_room set clock_ends_at = null where draft_room.season = r.season;
  return jsonb_build_object('selection', sid);
end $$;

-- The commissioner announces a coach's pick, or sends him back to the board.
create or replace function public.draft_decide(p_selection bigint, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into s from public.draft_selections where id = p_selection and status = 'pending' for update;
  if s.id is null then raise exception 'That pick was already decided'; end if;
  if p_approve then
    perform public.draft_finalize(s.id); perform public.draft_next(s.season);
  else
    update public.draft_selections set status = 'denied', decided_at = now() where id = s.id;
    perform public.draft_set_clock(s.season, 0);
  end if;
  return jsonb_build_object('approved', p_approve);
end $$;

create or replace function public.draft_pause(p_pause boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null or r.status = 'done' then raise exception 'The draft is not on'; end if;
  if p_pause and r.status = 'live' then
    update public.draft_room set status = 'paused',
      paused_left = greatest(0, ceil(extract(epoch from (coalesce(clock_ends_at, now()) - greatest(now(), coalesce(clock_starts_at, now()))))))::int
    where draft_room.season = r.season;
  elsif not p_pause and r.status = 'paused' then
    update public.draft_room set status = 'live', clock_starts_at = now(),
      clock_ends_at = case when exists (select 1 from public.draft_selections s where s.season = r.season and s.status = 'pending') then null
                           else now() + make_interval(secs => greatest(coalesce(r.paused_left, 0), 5)) end, paused_left = null
    where draft_room.season = r.season;
  end if;
  return jsonb_build_object('paused', p_pause);
end $$;

-- Finishes every pick that's left right away (approves a waiting coach pick, auto-picks for everyone else).
create or replace function public.draft_finish_all(p_season int) returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; p public.draft_selections;
begin
  if not exists (select 1 from public.draft_room where season = p_season) then
    if not exists (select 1 from public.draft_slots(p_season)) then return 0; end if;
    insert into public.draft_room (season) values (p_season);
  end if;
  update public.draft_room set status = 'live' where season = p_season and status = 'paused';
  while (select status from public.draft_room where season = p_season) <> 'done' loop
    p := null;
    select * into p from public.draft_selections where season = p_season and status = 'pending' limit 1;
    if p.id is not null then perform public.draft_finalize(p.id); perform public.draft_next(p_season);
    else perform public.draft_auto_pick(p_season, 'auto'); end if;
    n := n + 1;
    if n > 500 then raise exception 'draft did not finish'; end if;
  end loop;
  return n;
end $$;

create or replace function public.draft_sim_to_end() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.draft_room where season = public.setting_int('current_season')) then raise exception 'Start the draft first'; end if;
  return jsonb_build_object('picks', public.draft_finish_all(public.setting_int('current_season')));
end $$;

revoke execute on function public.draft_slots(int), public.rookie_deal(int, int), public.draft_bot_choice(text, int), public.draft_set_clock(int, int),
  public.draft_finalize(bigint), public.draft_next(int), public.draft_auto_pick(int, text), public.draft_finish_all(int) from public, anon, authenticated;
grant execute on function public.draft_slots(int) to anon, authenticated;
revoke execute on function public.draft_start(), public.draft_make_pick(text), public.draft_decide(bigint, boolean), public.draft_pause(boolean),
  public.draft_sim_to_end(), public.draft_tick() from public, anon;
grant execute on function public.draft_start(), public.draft_make_pick(text), public.draft_decide(bigint, boolean), public.draft_pause(boolean),
  public.draft_sim_to_end(), public.draft_tick() to authenticated;
grant execute on function public.draft_tick() to anon;
