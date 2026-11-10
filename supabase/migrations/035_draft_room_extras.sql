-- Draft room extras: coaches flag prospects, 3-minute first round then 2 minutes, random bot picks for now, Skip, and who's online.

create table if not exists public.draft_flags (
  team_id text not null references public.teams(id), player_id text not null references public.players(id),
  season int not null, created_at timestamptz not null default now(), primary key (team_id, player_id)
);
alter table public.draft_flags enable row level security;
create policy draft_flags_read on public.draft_flags for select using (team_id = public.my_team_id() or public.is_commissioner());

create table if not exists public.user_presence (user_id uuid primary key, last_seen timestamptz not null default now());
alter table public.user_presence enable row level security; -- no policies: only the functions below touch it

insert into public.league_settings (key, value) values ('draft_pick_seconds_r1', '180') on conflict (key) do nothing;
update public.league_settings set value = '120' where key = 'draft_pick_seconds';

-- A coach stars a prospect he likes (only his team sees it). Returns true if he's flagged now.
create or replace function public.toggle_draft_flag(p_player text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare my_team text := public.my_team_id(); v_season int;
begin
  if my_team is null then raise exception 'Only a coach can flag players'; end if;
  select draft_season into v_season from public.players where id = p_player and status = 'prospect';
  if v_season is null then raise exception 'That player is not in the draft'; end if;
  if exists (select 1 from public.draft_flags where team_id = my_team and player_id = p_player) then
    delete from public.draft_flags where team_id = my_team and player_id = p_player;
    return false;
  end if;
  insert into public.draft_flags (team_id, player_id, season) values (my_team, p_player, v_season);
  return true;
end $$;

-- Every logged-in screen says "still here" every 30 seconds.
create or replace function public.touch_presence() returns void
language sql security definer set search_path = '' as $$
  insert into public.user_presence (user_id, last_seen) select auth.uid(), now() where auth.uid() is not null
  on conflict (user_id) do update set last_seen = now();
$$;

-- For the commissioner: each coach and when his screen last checked in.
create or replace function public.coach_presence() returns table (team_id text, username text, last_seen timestamptz, online boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_commissioner() or public.is_site_owner()) then raise exception 'not allowed'; end if;
  return query select p.team_id, p.username, u.last_seen, coalesce(u.last_seen > now() - interval '75 seconds', false)
    from public.profiles p left join public.user_presence u on u.user_id = p.user_id
    where p.role = 'coach' and p.team_id is not null;
end $$;

-- Bots pick at random from the 10 best players left (real bot coaching comes later).
create or replace function public.draft_bot_choice(p_team text, p_season int) returns text
language sql volatile security definer set search_path = '' as $$
  select id from (
    select pr.id from public.players pr
    where pr.status = 'prospect' and pr.draft_season = p_season
      and not exists (select 1 from public.draft_selections s where s.player_id = pr.id and s.status <> 'denied')
    order by pr.stars desc, random() limit 10
  ) best order by random() limit 1
$$;

-- When a coach runs out of time, he gets his best flagged player; no flags, the computer picks for him.
create or replace function public.draft_timeout_choice(p_team text, p_season int) returns text
language sql volatile security definer set search_path = '' as $$
  select coalesce((
    select pr.id from public.draft_flags f join public.players pr on pr.id = f.player_id
    where f.team_id = p_team and pr.status = 'prospect' and pr.draft_season = p_season
      and not exists (select 1 from public.draft_selections s where s.player_id = pr.id and s.status <> 'denied')
    order by pr.stars desc, f.created_at limit 1), public.draft_bot_choice(p_team, p_season))
$$;

create or replace function public.draft_auto_pick(p_season int, p_how text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; who text; sid bigint;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  who := case when p_how = 'bot' then public.draft_bot_choice(sl.team_id, p_season) else public.draft_timeout_choice(sl.team_id, p_season) end;
  if who is null then perform public.draft_next(p_season); return null; end if;
  insert into public.draft_selections (season, pick_no, round, slot, team_id, original_team_id, player_id, status, how)
  values (p_season, r.pick_no, sl.round, sl.slot, sl.team_id, sl.original_team_id, who, 'pending', p_how) returning id into sid;
  perform public.draft_finalize(sid);
  perform public.draft_next(p_season);
  return sid;
end $$;

-- First round: 3 minutes a pick. After that: 2 minutes. Bots take a few seconds.
create or replace function public.draft_set_clock(p_season int, p_delay int) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; secs int;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  secs := case
    when public.is_bot_team(sl.team_id) then public.setting_int('draft_bot_min_seconds')
      + floor(random() * (public.setting_int('draft_bot_max_seconds') - public.setting_int('draft_bot_min_seconds') + 1))::int
    when sl.round = 1 then coalesce(public.setting_int('draft_pick_seconds_r1'), 180)
    else public.setting_int('draft_pick_seconds') end;
  update public.draft_room set clock_starts_at = now() + make_interval(secs => p_delay),
    clock_ends_at = now() + make_interval(secs => p_delay + secs), paused_left = null where season = p_season;
end $$;

-- The commissioner skips whoever is on the clock: the pick is made for them right now.
create or replace function public.draft_skip() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); r public.draft_room; owner text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.draft_room where draft_room.season = v_season for update;
  if r.season is null or r.status = 'done' then raise exception 'The draft is not on'; end if;
  if exists (select 1 from public.draft_selections s where s.season = v_season and s.status = 'pending') then
    raise exception 'A pick is waiting for you: approve or deny it first';
  end if;
  select team_id into owner from public.draft_slots(v_season) where pick_no = r.pick_no;
  update public.draft_room set status = 'live' where draft_room.season = v_season;
  perform public.draft_auto_pick(v_season, case when public.is_bot_team(owner) then 'bot' else 'auto' end);
  return jsonb_build_object('skipped', owner);
end $$;

-- The tick also hands back the server's clock so every screen counts down together.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.draft_tick()'::regprocedure);
  d := replace(d, 'jsonb_build_object(''acted''', 'jsonb_build_object(''now'', now(), ''acted''');
  execute d;
end $$;

revoke execute on function public.draft_timeout_choice(text, int), public.draft_bot_choice(text, int) from public, anon, authenticated;
revoke execute on function public.toggle_draft_flag(text), public.touch_presence(), public.coach_presence(), public.draft_skip() from public, anon;
grant execute on function public.toggle_draft_flag(text), public.touch_presence(), public.coach_presence(), public.draft_skip() to authenticated;
