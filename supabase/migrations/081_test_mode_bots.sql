-- Test mode = bots only. While test mode is on, every team is run by a bot coach: teams with a human coach get a test coach
-- (the bot brain already stored for that team) that handles re-signing, free agency, the draft and weekly moves, and the
-- human can look but can't make moves. Teams that were already bots stay exactly as they are. Off again = humans coach.
create or replace function public.is_bot_team(p_team text) returns boolean language sql stable security definer set search_path to '' as $$
  select public.test_mode() or not exists (select 1 from public.profiles pr where pr.team_id = p_team and pr.role = 'coach')
$$;

-- The team a coach may make moves for. In test mode it refuses with a clear message instead.
create or replace function public.my_coach_team() returns text language plpgsql stable security definer set search_path to '' as $$
declare t text := public.my_team_id();
begin
  if t is not null and public.test_mode() then
    raise exception 'Test mode is on: a test coach (bot) is running every team, so moves are locked until the commissioner turns test mode off.';
  end if;
  return t;
end $$;

-- Every coach action goes through it (the watch list stays open: it doesn't change anything about a team).
do $$
declare f text; d text; n text;
begin
  foreach f in array array['call_timeout', 'cancel_trade', 'draft_make_pick', 'make_fa_offer', 'negotiate_resign', 'pick_specialty_game', 'propose_trade',
    'request_drip_change', 'request_endzone_change', 'request_jersey_change', 'request_number_change', 'respond_trade', 'scout_player', 'set_my_coach',
    'set_my_scheme', 'toggle_trade_block', 'toggle_untouchable', 'withdraw_fa_offer'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f loop
      n := replace(d, 'public.my_team_id()', 'public.my_coach_team()');
      if n = d then raise exception '%: my_team_id not found', f; end if;
      execute n;
    end loop;
  end loop;
end $$;
