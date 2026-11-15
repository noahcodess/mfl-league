-- The Draft tab: next season's prospects come out at a commissioner-set week (1-5, default 2) and scouting opens with them.
-- Draft scouts count toward the next draft (2 per 1st-round pick, 1 per 2nd or 3rd by default) and reset after it.
-- Free agency scouts: 5 a season (reset when the new season starts, right after the Craft Bowl). Watch list: any player.

insert into public.league_settings (key, value) values
  ('prospect_reveal_week', '2'), ('draft_scouts_r1', '2'), ('draft_scouts_later', '1')
on conflict (key) do nothing;

create or replace function public.scouts_left(p_team text, p_kind text) returns integer language sql stable security definer set search_path to '' as $function$
  select case when p_kind = 'draft' then
      (select coalesce(sum(case when round = 1 then coalesce(public.setting_int('draft_scouts_r1'), 2) else coalesce(public.setting_int('draft_scouts_later'), 1) end), 0)
         from public.picks where owner_id = p_team and season = public.next_draft_season())::int
      - (select count(*) from public.scout_reports where team_id = p_team and kind = 'draft' and season = public.next_draft_season())::int
    else coalesce(public.setting_int('fa_scouts'), 5)
      - (select count(*) from public.scout_reports where team_id = p_team and kind = 'fa' and season = public.setting_int('current_season'))::int end
$function$;

create or replace function public.scout_player(p_player text) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare p public.players; my_team text := public.my_team_id(); kind text;
begin
  if my_team is null then raise exception 'Only a team''s coach can send scouts'; end if;
  select * into p from public.players where id = p_player;
  kind := case p.status when 'prospect' then 'draft' when 'free_agent' then 'fa' end;
  if kind is null then raise exception 'You can only scout draft prospects and free agents'; end if;
  if kind = 'draft' and p.draft_season is distinct from public.next_draft_season() then raise exception 'He isn''t in the next draft'; end if;
  if exists (select 1 from public.scout_reports where team_id = my_team and player_id = p.id) then raise exception 'You already scouted him'; end if;
  if public.scouts_left(my_team, kind) <= 0 then
    raise exception '%', case when kind = 'draft' then 'No draft scouts left for this draft' else 'No free agency scouts left this season' end;
  end if;
  insert into public.scout_reports (team_id, player_id, season, kind)
    values (my_team, p.id, case when kind = 'draft' then p.draft_season else public.setting_int('current_season') end, kind);
  return jsonb_build_object('left', public.scouts_left(my_team, kind),
    'potential', (select potential from public.player_potential where player_id = p.id),
    'ceilings', (select ceilings from public.player_potential where player_id = p.id));
end $function$;

-- Watch list (still stored as draft flags): any player who hasn't retired, not just prospects.
create or replace function public.toggle_draft_flag(p_player text) returns boolean language plpgsql security definer set search_path to '' as $function$
declare my_team text := public.my_team_id(); v_season int;
begin
  if my_team is null then raise exception 'Only a coach can keep a watch list'; end if;
  select coalesce(draft_season, public.setting_int('current_season')) into v_season from public.players where id = p_player and status <> 'retired';
  if v_season is null then raise exception 'Player not found'; end if;
  if exists (select 1 from public.draft_flags where team_id = my_team and player_id = p_player) then
    delete from public.draft_flags where team_id = my_team and player_id = p_player;
    return false;
  end if;
  insert into public.draft_flags (team_id, player_id, season) values (my_team, p_player, v_season);
  return true;
end $function$;

-- Next season's class arrives once the regular season reaches the reveal week (never earlier, so nobody can peek).
create or replace function public.ensure_next_draft_class() returns integer language plpgsql security definer set search_path to '' as $function$
declare season int := public.setting_int('current_season'); n int;
begin
  if (select value #>> '{}' from public.league_settings where key = 'phase') is distinct from 'regular_season' then return 0; end if;
  if coalesce(public.setting_int('current_week'), 0) < least(5, greatest(1, coalesce(public.setting_int('prospect_reveal_week'), 2)))  then return 0; end if;
  if exists (select 1 from public.players where status = 'prospect' and draft_season = season + 1) then return 0; end if;
  n := public.generate_draft_class(season + 1, coalesce(public.setting_int('draft_class_size'), 80));
  perform public.log_event('draft_class', null, null, format('The Season %s draft class is out: %s prospects. Scouting is open.', season + 1, n));
  perform public.notify(null, false, true, 'draft_class', format('The Season %s draft class is out', season + 1),
    format('%s prospects are on the board. Send your scouts from My Team → Draft.', n), jsonb_build_object('season', season + 1));
  return n;
end $function$;

create or replace function public.trg_next_draft_class() returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.key in ('current_week', 'phase', 'prospect_reveal_week') then perform public.ensure_next_draft_class(); end if;
  return new;
end $function$;
drop trigger if exists next_draft_class on public.league_settings;
create trigger next_draft_class after update on public.league_settings for each row execute function public.trg_next_draft_class();

create or replace function public.set_league_number(p_key text, p_value integer) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare lo int; hi int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select x.lo, x.hi into lo, hi from (values
    ('draft_pick_seconds_top5', 30, 900), ('regression_from_season', 1, 99), ('trade_request_angry_pct', 0, 100), ('drip_cooldown', 0, 12), ('trade_request_unhappy_pct', 0, 100), ('draft_pick_seconds_r1', 30, 900), ('draft_pick_seconds', 30, 900), ('draft_pick_seconds_r3', 30, 900),
    ('draft_bot_min_seconds', 2, 120), ('draft_bot_max_seconds', 2, 180), ('draft_countdown_seconds', 0, 10),
    ('draft_auto_approve_seconds', 15, 900), ('draft_auto_announce_seconds', 15, 900),
    ('draft_room_opens_minutes', 0, 120), ('game_room_opens_minutes', 0, 60),
    ('prospect_reveal_week', 1, 5), ('draft_scouts_r1', 0, 6), ('draft_scouts_later', 0, 4), ('fa_scouts', 0, 20),
    ('draft_class_size', 48, 120), ('k_pot5_pct', 0, 20), ('k_pot45_max', 0, 6)) as x(k, lo, hi) where x.k = p_key;
  if lo is null then raise exception 'That setting can''t be changed here'; end if;
  if p_value is null or p_value < lo or p_value > hi then raise exception 'Pick a number from % to %', lo, hi; end if;
  update public.league_settings set value = to_jsonb(p_value) where key = p_key;
  return jsonb_build_object(p_key, p_value);
end $function$;
