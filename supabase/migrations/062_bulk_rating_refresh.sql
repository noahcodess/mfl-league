-- 062: Birthday was timing out (every single player update re-ranked the whole league). Big offseason steps now pause the
-- team-ratings trigger and refresh once at the end: Birthday went from ~12s to under 1s. Also the Dragons' Bloodbath jersey.
create or replace function public.trg_refresh_team_ratings() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if current_setting('mfl.bulk', true) = 'on' then return null; end if; -- big batch jobs refresh once at the end instead
  perform public.refresh_team_ratings();
  return null;
end $$;

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
  d := replace(d, $x$  perform public.take_snapshot(format('Before %s (Season %s)', names[step + 1], season));$x$,
    $x$  perform public.take_snapshot(format('Before %s (Season %s)', names[step + 1], season));
  perform set_config('mfl.bulk', 'on', true);$x$);
  d := replace(d, $x$  perform public.data_audit();
  return jsonb_build_object('step', names[step + 1], 'affected', n);$x$,
    $x$  perform set_config('mfl.bulk', 'off', true);
  perform public.refresh_team_ratings();
  perform public.data_audit();
  return jsonb_build_object('step', names[step + 1], 'affected', n);$x$);
  if d not like '%mfl.bulk'', ''on%' or d not like '%mfl.bulk'', ''off%' then raise exception 'offseason patch failed'; end if;
  execute d;
end $do$;

-- Dragons alternate: Bloodbath, all red (the whole crowd wears red for it).
update public.team_jerseys set name = 'Bloodbath', updated_at = now(), colors = '{"helmet":"#b00b0a","mask":"#18191c","stripe":"#1f2024","jersey":"#b00b0a","numbers":"#1f2024","trim":"#1f2024","pants":"#b00b0a","socks":"#b00b0a"}'::jsonb
where team_id = 'crf' and slot = 3;
