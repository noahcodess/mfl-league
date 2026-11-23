-- 097: the commissioner's "Injure a player" test tool (test mode only, like the other test tools).
create or replace function public.game_add_input(p_game bigint, p_input jsonb)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare st public.game_state;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_input->>'kind' not in ('timeout', 'ot', 'win', 'score', 'timeouts', 'onside', 'injury') then raise exception 'Unknown input'; end if;
  if p_input->>'kind' <> 'timeout' and not public.test_mode() then raise exception 'Test tools only work in test mode.'; end if;
  select * into st from public.game_state where game_id = p_game for update;
  if st.game_id is null or st.status <> 'live' then raise exception 'The game is not live'; end if;
  update public.game_state set inputs = inputs || jsonb_build_array(p_input), updated_at = now() where game_id = p_game;
  return jsonb_build_object('ok', true);
end $function$;
