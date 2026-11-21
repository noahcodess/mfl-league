-- The broadcast also saves each team's timeouts left as it goes, so the coaching rooms show the real count.
drop function if exists public.game_progress(bigint, int, int, int, int, int);
create or replace function public.game_progress(p_game bigint, p_play int, p_home int, p_away int, p_quarter int, p_clock int, p_to_home int default null, p_to_away int default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.game_state set play_index = greatest(0, p_play), home_score = p_home, away_score = p_away,
    quarter = least(5, greatest(1, p_quarter)), clock_left = greatest(0, p_clock), clock_running = false,
    home_timeouts = coalesce(p_to_home, home_timeouts), away_timeouts = coalesce(p_to_away, away_timeouts), updated_at = now()
  where game_id = p_game and status = 'live';
end $$;
revoke execute on function public.game_progress(bigint, int, int, int, int, int, int, int) from public, anon;
grant execute on function public.game_progress(bigint, int, int, int, int, int, int, int) to authenticated;
