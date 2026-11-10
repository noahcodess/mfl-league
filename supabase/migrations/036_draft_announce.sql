-- Announcing picks: the pick comes in, the commissioner accepts it, the clock holds at 0:00 until he announces it.
-- First round: "Revealed in 3, 2, 1" and a slow reveal. Rounds 2-3: picks reveal on their own, quickly. Plus going back a pick.

alter table public.draft_selections drop constraint if exists draft_selections_status_check;
alter table public.draft_selections add constraint draft_selections_status_check check (status in ('pending', 'ready', 'approved', 'denied'));
alter table public.draft_selections add column if not exists reveal_at timestamptz,
  add column if not exists grade text, add column if not exists grade_notes jsonb, add column if not exists grade_score int;

-- Nobody sees a pick before it's announced, except the commissioner and the team that made it.
alter policy draft_selections_read on public.draft_selections
  using (status = 'approved' or public.is_commissioner() or team_id = public.my_team_id());

insert into public.league_settings (key, value) values
  ('draft_announce_rounds', '1'), ('draft_countdown_seconds', '3'), ('draft_reveal_seconds_r1', '12'),
  ('draft_auto_announce_seconds', '150')
on conflict (key) do nothing;
update public.league_settings set value = '5' where key = 'draft_reveal_seconds';

-- Moves to the next pick and starts its clock after p_delay seconds (the reveal), or wraps up the draft.
create or replace function public.draft_advance(p_season int, p_delay int) returns void
language plpgsql security definer set search_path = '' as $$
declare total int := (select count(*) from public.draft_slots(p_season)); n int;
begin
  update public.draft_room set pick_no = pick_no + 1 where season = p_season;
  if (select pick_no from public.draft_room where season = p_season) > total then
    update public.draft_room set status = 'done', finished_at = now(), clock_starts_at = null, clock_ends_at = null where season = p_season;
    update public.players set status = 'free_agent', left_season = p_season where status = 'prospect' and draft_season = p_season;
    get diagnostics n = row_count;
    perform public.log_event('draft_done', null, null, format('The Season %s draft is over. %s undrafted players became free agents', p_season, n),
      jsonb_build_object('undrafted', n));
  else
    perform public.draft_set_clock(p_season, p_delay);
  end if;
end $$;

create or replace function public.draft_next(p_season int) returns void
language sql security definer set search_path = '' as $$ select public.draft_advance(p_season, public.setting_int('draft_reveal_seconds')) $$;

-- Makes the pick official on screen: rookie deal, joins the team, reveal starts after the countdown, next team goes on the clock.
create or replace function public.draft_announce_pick(p_sel bigint, p_countdown int) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections; secs int;
begin
  select * into s from public.draft_selections where id = p_sel;
  perform public.draft_finalize(s.id);
  update public.draft_selections set reveal_at = now() + make_interval(secs => p_countdown) where id = s.id;
  secs := case when s.round <= public.setting_int('draft_announce_rounds') then public.setting_int('draft_reveal_seconds_r1') else public.setting_int('draft_reveal_seconds') end;
  perform public.draft_advance(s.season, p_countdown + secs);
end $$;

-- A pick is in and accepted: grade it, stop the clock at 0:00, and either wait for the announcement or reveal it right away.
create or replace function public.draft_ready(p_sel bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections;
begin
  update public.draft_selections set status = 'ready', decided_at = now() where id = p_sel returning * into s;
  perform public.draft_grade(p_sel);
  update public.draft_room set clock_ends_at = now() where season = s.season;
  if s.round > public.setting_int('draft_announce_rounds') then perform public.draft_announce_pick(p_sel, 0); end if;
end $$;

create or replace function public.draft_auto_pick(p_season int, p_how text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; who text; sid bigint;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  who := case when p_how = 'bot' then public.draft_bot_choice(sl.team_id, p_season) else public.draft_timeout_choice(sl.team_id, p_season) end;
  if who is null then perform public.draft_advance(p_season, 0); return null; end if;
  insert into public.draft_selections (season, pick_no, round, slot, team_id, original_team_id, player_id, status, how)
  values (p_season, r.pick_no, sl.round, sl.slot, sl.team_id, sl.original_team_id, who, 'pending', p_how) returning id into sid;
  perform public.draft_ready(sid);
  return sid;
end $$;
