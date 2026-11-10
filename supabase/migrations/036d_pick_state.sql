-- A public "pick is in" flag on the room, so every screen can show it without seeing who was picked.
alter table public.draft_room add column if not exists pick_state text not null default 'clock' check (pick_state in ('clock', 'in', 'accepted'));
do $$
declare d text;
begin
  d := pg_get_functiondef('public.draft_set_clock(integer, integer)'::regprocedure);
  d := replace(d, 'paused_left = null where season = p_season;', 'paused_left = null, pick_state = ''clock'' where season = p_season;');
  execute d;
  d := pg_get_functiondef('public.draft_make_pick(text)'::regprocedure);
  d := replace(d, 'update public.draft_room set clock_ends_at = null where', 'update public.draft_room set clock_ends_at = null, pick_state = ''in'' where');
  execute d;
  d := pg_get_functiondef('public.draft_ready(bigint)'::regprocedure);
  d := replace(d, 'update public.draft_room set clock_ends_at = now() where', 'update public.draft_room set clock_ends_at = now(), pick_state = ''accepted'' where');
  execute d;
end $$;
