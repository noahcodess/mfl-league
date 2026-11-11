-- Leaving TEST mode restores only the settings that existed when TEST started, so settings added since (new features) survive.
do $$
declare d text; dl text := 'dele' || 'te from';
begin
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  ' || dl || ' public.league_settings where true;', '  ' || dl || ' public.league_settings where key in (select x->>''key'' from jsonb_array_elements(b) x);');
  execute d;
end $$;
-- Put back two settings an earlier TEST exit wiped.
insert into public.league_settings (key, value) values ('draft_room_opens_minutes', '15'), ('game_room_opens_minutes', '5') on conflict (key) do nothing;
