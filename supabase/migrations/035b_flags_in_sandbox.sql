-- Flags go away with their player (class rerolls) and TEST mode backs them up and puts them back.
alter table public.draft_flags drop constraint draft_flags_player_id_fkey,
  add constraint draft_flags_player_id_fkey foreign key (player_id) references public.players(id) on delete cascade;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''draft_selections'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_selections t));',
    '(''draft_selections'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_selections t)),
    (''draft_flags'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_flags t));');
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  select rows into b from public.sandbox_backup where name = ''teams'';', '  select rows into b from public.sandbox_backup where name = ''draft_flags'';
  insert into public.draft_flags select * from jsonb_populate_recordset(null::public.draft_flags, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''teams'';');
  execute d;
end $$;
