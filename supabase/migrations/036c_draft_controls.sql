-- The commissioner's draft controls under the new flow: accept/deny, announce, go back a pick, skip; plus the tick and finishing up.

create or replace function public.draft_tick() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; p public.draft_selections; owner text;
begin
  select * into r from public.draft_room where draft_room.season = v_season for update skip locked;
  if r.season is null or r.status <> 'live' then return jsonb_build_object('now', now(), 'acted', false); end if;
  select * into p from public.draft_selections s where s.season = r.season and s.status in ('pending', 'ready') order by s.id desc limit 1;
  if p.status = 'pending' and p.created_at < now() - make_interval(secs => public.setting_int('draft_auto_approve_seconds')) then
    perform public.draft_ready(p.id); return jsonb_build_object('now', now(), 'acted', true);
  end if;
  if p.status = 'ready' and p.decided_at < now() - make_interval(secs => public.setting_int('draft_auto_announce_seconds')) then
    perform public.draft_announce_pick(p.id, public.setting_int('draft_countdown_seconds')); return jsonb_build_object('now', now(), 'acted', true);
  end if;
  if p.id is not null or r.clock_ends_at is null or now() < r.clock_ends_at then return jsonb_build_object('now', now(), 'acted', false); end if;
  select team_id into owner from public.draft_slots(r.season) where pick_no = r.pick_no;
  perform public.draft_auto_pick(r.season, case when public.is_bot_team(owner) then 'bot' else 'auto' end);
  return jsonb_build_object('now', now(), 'acted', true);
end $$;

create or replace function public.draft_decide(p_selection bigint, p_approve boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into s from public.draft_selections where id = p_selection and status = 'pending' for update;
  if s.id is null then raise exception 'That pick was already decided'; end if;
  if p_approve then perform public.draft_ready(s.id);
  else
    update public.draft_selections set status = 'denied', decided_at = now() where id = s.id;
    perform public.draft_set_clock(s.season, 0);
  end if;
  return jsonb_build_object('approved', p_approve);
end $$;

-- The commissioner announces the pick: everyone's screen counts down 3, 2, 1, then the reveal plays.
create or replace function public.draft_announce() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); s public.draft_selections;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into s from public.draft_selections where season = v_season and status = 'ready' for update;
  if s.id is null then raise exception 'There is no pick waiting to be announced'; end if;
  perform public.draft_announce_pick(s.id, public.setting_int('draft_countdown_seconds'));
  return jsonb_build_object('announced', s.id, 'countdown', public.setting_int('draft_countdown_seconds'));
end $$;

-- Go back a pick: an unannounced pick goes back to the board; otherwise the last announced pick is taken back.
create or replace function public.draft_undo_pick() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; p public.draft_selections; pos text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null then raise exception 'The draft has not started'; end if;
  select * into p from public.draft_selections where season = v_season and status in ('pending', 'ready') order by id desc limit 1;
  if p.id is not null then
    update public.draft_selections set status = 'denied', decided_at = now() where id = p.id;
    perform public.draft_set_clock(v_season, 0);
    return jsonb_build_object('undone', p.pick_no, 'announced', false);
  end if;
  select * into p from public.draft_selections where season = v_season and status = 'approved' order by pick_no desc limit 1;
  if p.id is null then raise exception 'No picks to take back'; end if;
  if r.status = 'done' and public.setting_int('offseason_step') <> 3 then raise exception 'The draft is over and the league moved on'; end if;
  select position into pos from public.players where id = p.player_id;
  delete from public.contracts where player_id = p.player_id and source = 'draft';
  update public.players set status = 'prospect', team_id = null, number = null, depth = null, slot = null,
    rookie_season = null, draft_round = null, draft_pick = null, drafted_by = null where id = p.player_id;
  perform public.place_depth(p.team_id, pos);
  update public.draft_selections set status = 'denied', decided_at = now() where id = p.id;
  if r.status = 'done' then
    update public.players set status = 'prospect' where draft_season = v_season and status = 'free_agent' and team_id is null;
  end if;
  update public.draft_room set pick_no = p.pick_no, status = 'live', finished_at = null where draft_room.season = v_season;
  perform public.draft_set_clock(v_season, 0);
  perform public.log_event('draft_undo', p.player_id, p.team_id, format('Pick %s was taken back by the commissioner', p.pick_no));
  return jsonb_build_object('undone', p.pick_no, 'announced', true);
end $$;

create or replace function public.draft_skip() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; owner text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null or r.status = 'done' then raise exception 'The draft is not on'; end if;
  if exists (select 1 from public.draft_selections s where s.season = v_season and s.status in ('pending', 'ready')) then
    raise exception 'A pick is already in: accept, deny or announce it first';
  end if;
  select team_id into owner from public.draft_slots(v_season) where pick_no = r.pick_no;
  update public.draft_room set status = 'live' where draft_room.season = v_season;
  perform public.draft_auto_pick(v_season, case when public.is_bot_team(owner) then 'bot' else 'auto' end);
  return jsonb_build_object('skipped', owner);
end $$;

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
    select * into p from public.draft_selections where season = p_season and status in ('pending', 'ready') order by id desc limit 1;
    if p.status = 'pending' then perform public.draft_ready(p.id);
    elsif p.status = 'ready' then perform public.draft_announce_pick(p.id, 0);
    else perform public.draft_auto_pick(p_season, 'auto'); end if;
    n := n + 1;
    if n > 500 then raise exception 'draft did not finish'; end if;
  end loop;
  return n;
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.draft_make_pick(text)'::regprocedure);
  d := replace(d, 's.season = r.season and s.status = ''pending'') then raise exception ''Your pick is already in''',
                  's.season = r.season and s.status in (''pending'', ''ready'')) then raise exception ''Your pick is already in''');
  execute d;
end $$;

revoke execute on function public.draft_announce(), public.draft_undo_pick() from public, anon;
grant execute on function public.draft_announce(), public.draft_undo_pick() to authenticated;
