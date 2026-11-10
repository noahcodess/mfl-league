-- Hooks the draft into the rest of the league: the Draft step finishes it, Undo and TEST mode put it back.

alter table public.league_snapshots add column if not exists draft jsonb;

do $$
declare d text; dl text := 'dele' || 'te from';
begin
  -- Snapshots remember the draft room and each player's draft details.
  d := pg_get_functiondef('public.take_snapshot(text)'::regprocedure);
  d := replace(d, 'fa_offers, attributes, last_event_id, created_by)', 'fa_offers, attributes, draft, last_event_id, created_by)');
  d := replace(d, '''weight_lb'', weight_lb)', '''weight_lb'', weight_lb, ''rookie_season'', rookie_season, ''draft_round'', draft_round, ''draft_pick'', draft_pick, ''drafted_by'', drafted_by)');
  d := replace(d, 'from public.player_attributes),', 'from public.player_attributes),
    jsonb_build_object(''room'', (select coalesce(jsonb_agg(to_jsonb(r)), ''[]'') from public.draft_room r),
                       ''selections'', (select coalesce(jsonb_agg(to_jsonb(s)), ''[]'') from public.draft_selections s)),');
  execute d;

  d := pg_get_functiondef('public.undo_last_step()'::regprocedure);
  d := replace(d, 'weight_lb = case when x ? ''weight_lb'' then (x->>''weight_lb'')::int else p.weight_lb end',
    'weight_lb = case when x ? ''weight_lb'' then (x->>''weight_lb'')::int else p.weight_lb end,
    rookie_season = case when x ? ''rookie_season'' then (x->>''rookie_season'')::int else p.rookie_season end,
    draft_round = case when x ? ''draft_round'' then (x->>''draft_round'')::int else p.draft_round end,
    draft_pick = case when x ? ''draft_pick'' then (x->>''draft_pick'')::int else p.draft_pick end,
    drafted_by = case when x ? ''drafted_by'' then x->>''drafted_by'' else p.drafted_by end');
  d := replace(d, '  ' || dl || ' public.league_events where id > s.last_event_id;', '  if s.draft is not null then
    ' || dl || ' public.draft_selections where true;
    ' || dl || ' public.draft_room where true;
    insert into public.draft_room select * from jsonb_populate_recordset(null::public.draft_room, s.draft->''room'');
    insert into public.draft_selections overriding system value select * from jsonb_populate_recordset(null::public.draft_selections, s.draft->''selections'');
  end if;
  ' || dl || ' public.league_events where id > s.last_event_id;');
  execute d;

  -- TEST mode backs up and restores the draft too.
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''league_snapshots'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.league_snapshots t));',
    '(''league_snapshots'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.league_snapshots t)),
    (''draft_room'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_room t)),
    (''draft_selections'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_selections t));');
  execute d;

  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  ' || dl || ' public.scout_reports where true;', '  ' || dl || ' public.draft_selections where true;
  ' || dl || ' public.draft_room where true;
  ' || dl || ' public.scout_reports where true;');
  d := replace(d, '  select rows into b from public.sandbox_backup where name = ''teams'';', '  select rows into b from public.sandbox_backup where name = ''draft_room'';
  insert into public.draft_room select * from jsonb_populate_recordset(null::public.draft_room, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''draft_selections'';
  insert into public.draft_selections overriding system value select * from jsonb_populate_recordset(null::public.draft_selections, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''teams'';');
  execute d;

  -- The Draft step finishes whatever's left of the draft before free agency closes.
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  d := replace(d, '  elsif step = 3 then
    extra := public.bot_fill_rosters();', '  elsif step = 3 then
    n := public.draft_finish_all(season);
    extra := public.bot_fill_rosters();');
  d := replace(d, 'format(''Season %s draft completed'', season)', 'format(''Season %s draft completed (%s picks made at the end)'', season, n)');
  execute d;
end $$;
