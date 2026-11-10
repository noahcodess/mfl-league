-- Clock rules: picks 1-5 get 4 minutes, rest of round 1 gets 3, round 2 gets 2, round 3 gets 1:30.
-- When a coach's time runs out the draft waits: he can't pick anymore, the commissioner auto-picks or makes the pick for him.
-- Reveals: picks 1-10 get the full show (14s), the rest of round 1 a shorter one (9s), rounds 2-3 a quick banner (5s).

alter table public.draft_selections drop constraint if exists draft_selections_how_check;
alter table public.draft_selections add constraint draft_selections_how_check check (how in ('coach', 'bot', 'auto', 'commish'));

insert into public.league_settings (key, value) values ('draft_pick_seconds_top5', '240'), ('draft_pick_seconds_r3', '90'), ('draft_reveal_seconds_top10', '14')
on conflict (key) do nothing;
update public.league_settings set value = '9' where key = 'draft_reveal_seconds_r1';

create or replace function public.draft_set_clock(p_season int, p_delay int) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; secs int;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  secs := case
    when public.is_bot_team(sl.team_id) then public.setting_int('draft_bot_min_seconds')
      + floor(random() * (public.setting_int('draft_bot_max_seconds') - public.setting_int('draft_bot_min_seconds') + 1))::int
    when sl.pick_no <= 5 then public.setting_int('draft_pick_seconds_top5')
    when sl.round = 1 then public.setting_int('draft_pick_seconds_r1')
    when sl.round = 2 then public.setting_int('draft_pick_seconds')
    else public.setting_int('draft_pick_seconds_r3') end;
  update public.draft_room set clock_starts_at = now() + make_interval(secs => p_delay),
    clock_ends_at = now() + make_interval(secs => p_delay + secs), paused_left = null, pick_state = 'clock' where season = p_season;
end $$;

create or replace function public.draft_announce_pick(p_sel bigint, p_countdown int) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections; secs int;
begin
  select * into s from public.draft_selections where id = p_sel;
  perform public.draft_finalize(s.id);
  update public.draft_selections set reveal_at = now() + make_interval(secs => p_countdown) where id = s.id;
  secs := case when s.pick_no <= 10 then public.setting_int('draft_reveal_seconds_top10')
               when s.round <= public.setting_int('draft_announce_rounds') then public.setting_int('draft_reveal_seconds_r1')
               else public.setting_int('draft_reveal_seconds') end;
  perform public.draft_advance(s.season, p_countdown + secs);
end $$;

-- Bots pick when their clock runs out. Coaches don't: the draft waits for the commissioner.
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
  if not public.is_bot_team(owner) then return jsonb_build_object('now', now(), 'acted', false, 'waiting', 'commissioner'); end if;
  perform public.draft_auto_pick(r.season, 'bot');
  return jsonb_build_object('now', now(), 'acted', true);
end $$;

-- The commissioner makes the pick for whoever is on the clock (usually a coach whose time ran out).
create or replace function public.draft_pick_for(p_player text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; sl record; sid bigint;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null or r.status = 'done' then raise exception 'The draft is not on'; end if;
  if exists (select 1 from public.draft_selections s where s.season = v_season and s.status in ('pending', 'ready')) then
    raise exception 'A pick is already in: accept, deny or announce it first';
  end if;
  if not exists (select 1 from public.players where id = p_player and status = 'prospect' and draft_season = v_season)
     or exists (select 1 from public.draft_selections s where s.player_id = p_player and s.status <> 'denied') then
    raise exception 'That player is already off the board';
  end if;
  select * into sl from public.draft_slots(v_season) where pick_no = r.pick_no;
  update public.draft_room set status = 'live' where draft_room.season = v_season;
  insert into public.draft_selections (season, pick_no, round, slot, team_id, original_team_id, player_id, status, how)
  values (v_season, r.pick_no, sl.round, sl.slot, sl.team_id, sl.original_team_id, p_player, 'pending', 'commish') returning id into sid;
  perform public.draft_ready(sid);
  return jsonb_build_object('selection', sid);
end $$;

-- Coaches can't turn in a pick after their clock hits zero.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.draft_make_pick(text)'::regprocedure);
  d := replace(d, '  if my_team is null or sl.team_id <> my_team then raise exception ''You are not on the clock''; end if;',
    '  if my_team is null or sl.team_id <> my_team then raise exception ''You are not on the clock''; end if;
  if r.pick_state <> ''clock'' or (r.clock_ends_at is not null and now() > r.clock_ends_at) then raise exception ''Time is up. The commissioner will make this pick.''; end if;');
  execute d;
end $$;

revoke execute on function public.draft_pick_for(text) from public, anon;
grant execute on function public.draft_pick_for(text) to authenticated;
