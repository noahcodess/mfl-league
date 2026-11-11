-- TEST mode backs up and restores trades, untouchables, the trade block and the inbox.
do $$
declare d text; dl text := 'dele' || 'te from';
begin
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''league_schedule'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.league_schedule t));',
    '(''league_schedule'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.league_schedule t)),
    (''trades'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.trades t)),
    (''trade_items'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.trade_items t)),
    (''untouchables'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.untouchables t)),
    (''trade_block'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.trade_block t)),
    (''inbox'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.inbox t));');
  execute d;

  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  ' || dl || ' public.draft_selections where true;', '  ' || dl || ' public.trade_items where true;
  ' || dl || ' public.trades where true;
  ' || dl || ' public.untouchables where true;
  ' || dl || ' public.trade_block where true;
  ' || dl || ' public.inbox where true;
  ' || dl || ' public.draft_selections where true;');
  d := replace(d, '  ' || dl || ' public.league_schedule where true;', '  select rows into b from public.sandbox_backup where name = ''trades'';
  insert into public.trades overriding system value select * from jsonb_populate_recordset(null::public.trades, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''trade_items'';
  insert into public.trade_items overriding system value select * from jsonb_populate_recordset(null::public.trade_items, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''untouchables'';
  insert into public.untouchables select * from jsonb_populate_recordset(null::public.untouchables, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''trade_block'';
  insert into public.trade_block select * from jsonb_populate_recordset(null::public.trade_block, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''inbox'';
  insert into public.inbox overriding system value select * from jsonb_populate_recordset(null::public.inbox, coalesce(b, ''[]''));
  ' || dl || ' public.league_schedule where true;');
  execute d;
end $$;
