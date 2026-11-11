-- Every pick shows the full clock (4:00 picks 1-5, 3:00 rest of round 1, 2:00 rounds 2 and 3).
-- Bots still pick at a random moment inside the commissioner's bot window; the clock on screen keeps its full length.

alter table public.draft_room add column if not exists bot_pick_at timestamptz;
update public.league_settings set value = '120' where key = 'draft_pick_seconds_r3';

create or replace function public.draft_set_clock(p_season int, p_delay int) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; secs int; bot int;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  secs := case when sl.pick_no <= 5 then public.setting_int('draft_pick_seconds_top5')
               when sl.round = 1 then public.setting_int('draft_pick_seconds_r1')
               when sl.round = 2 then public.setting_int('draft_pick_seconds')
               else public.setting_int('draft_pick_seconds_r3') end;
  bot := case when public.is_bot_team(sl.team_id) then public.setting_int('draft_bot_min_seconds')
    + floor(random() * (public.setting_int('draft_bot_max_seconds') - public.setting_int('draft_bot_min_seconds') + 1))::int end;
  update public.draft_room set clock_starts_at = now() + make_interval(secs => p_delay),
    clock_ends_at = now() + make_interval(secs => p_delay + secs),
    bot_pick_at = case when bot is null then null else now() + make_interval(secs => p_delay + least(bot, secs)) end,
    paused_left = null, pick_state = 'clock' where season = p_season;
end $$;

do $$
declare d text;
begin
  -- The tick: bots pick at their moment; coaches whose time runs out wait for the commissioner.
  d := pg_get_functiondef('public.draft_tick()'::regprocedure);
  d := replace(d, '  if p.id is not null or r.clock_ends_at is null or now() < r.clock_ends_at then return jsonb_build_object(''now'', now(), ''acted'', false); end if;
  select team_id into owner from public.draft_slots(r.season) where pick_no = r.pick_no;
  if not public.is_bot_team(owner) then',
  '  if p.id is not null or r.clock_ends_at is null then return jsonb_build_object(''now'', now(), ''acted'', false); end if;
  select team_id into owner from public.draft_slots(r.season) where pick_no = r.pick_no;
  if public.is_bot_team(owner) and now() >= coalesce(r.bot_pick_at, r.clock_ends_at) then
    perform public.draft_auto_pick(r.season, ''bot''); return jsonb_build_object(''now'', now(), ''acted'', true);
  end if;
  if now() < r.clock_ends_at then return jsonb_build_object(''now'', now(), ''acted'', false); end if;
  if not public.is_bot_team(owner) then');
  execute d;
  -- Resuming after a pause: a bot that was still thinking picks a few seconds later.
  d := pg_get_functiondef('public.draft_pause(boolean)'::regprocedure);
  d := replace(d, 'else now() + make_interval(secs => greatest(coalesce(r.paused_left, 0), 5)) end, paused_left = null',
    'else now() + make_interval(secs => greatest(coalesce(r.paused_left, 0), 5)) end,
      bot_pick_at = case when r.bot_pick_at is null then null else now() + interval ''5 seconds'' end, paused_left = null');
  execute d;
end $$;
