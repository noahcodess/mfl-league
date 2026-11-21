-- When a game's result is saved, its live state keeps the quarter it ended in (4, or 5 = OT, 6 = OT2 ...), so every
-- scoreboard can say FINAL/OT, FINAL/OT2 and so on. Covers watched and quick-simmed games alike.
create or replace function public.game_result_quarter() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.game_state set quarter = least(999, 4 + coalesce(new.overtimes, 0)) where game_id = new.game_id;
  return new;
end $$;
revoke execute on function public.game_result_quarter() from public, anon, authenticated;
drop trigger if exists game_result_quarter on public.game_results;
create trigger game_result_quarter after insert or update of overtimes on public.game_results for each row execute function public.game_result_quarter();
