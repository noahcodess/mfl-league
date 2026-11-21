-- Live inputs: things people do during a game (a coach's timeout, the commissioner calling one for a team, his test tools)
-- are saved with the game, so a resumed or quick-simmed game plays out the same way. The saved engine run is replaced
-- whenever an input changes it (same seed, same kickoff).
alter table public.game_state add column if not exists inputs jsonb not null default '[]'::jsonb;

-- Commissioner: add one input. Test tools only while test mode is on.
create or replace function public.game_add_input(p_game bigint, p_input jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare st public.game_state;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_input->>'kind' not in ('timeout', 'ot', 'win', 'score', 'timeouts') then raise exception 'Unknown input'; end if;
  if p_input->>'kind' <> 'timeout' and not public.test_mode() then raise exception 'Test tools only work in test mode.'; end if;
  select * into st from public.game_state where game_id = p_game for update;
  if st.game_id is null or st.status <> 'live' then raise exception 'The game is not live'; end if;
  update public.game_state set inputs = inputs || jsonb_build_array(p_input), updated_at = now() where game_id = p_game;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.game_add_input(bigint, jsonb) from public, anon;
grant execute on function public.game_add_input(bigint, jsonb) to authenticated;

create or replace function public.game_save_replay(p_game bigint, p_seed bigint, p_result jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare st public.game_state;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into st from public.game_state where game_id = p_game;
  if st.seed is null or st.seed <> p_seed then raise exception 'This game was not started with that kickoff.'; end if;
  if (select status from public.games where id = p_game) = 'final' then return jsonb_build_object('ok', false); end if;
  insert into public.game_replays (game_id, seed, result) values (p_game, p_seed, p_result)
  on conflict (game_id) do update set result = excluded.result, created_at = now();
  return jsonb_build_object('ok', true);
end $$;
