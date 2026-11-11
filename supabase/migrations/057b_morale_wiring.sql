-- 057b: Wire morale into the league. Tuning (excited is rarer, a losing streak stings vets), the locked trade block,
-- bots selling players who asked out, trades closing requests, morale checks each week and at FA open + camp,
-- the deadline cut on the league tick, commissioner mood edits and request odds, TEST mode backups.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.mood_calc(text, jsonb)'::regprocedure);
  d := replace(d, 'when s >= 2.0 then ''excited''', 'when s >= 2.4 then ''excited''');
  d := replace(d, 'when s >= -1.9 then ''unhappy''', 'when s >= -1.8 then ''unhappy''');
  d := replace(d, '  if fav then pos := pos + 1.1;',
'  if (ctx->>''wins'')::int + (ctx->>''losses'')::int >= 4 and (ctx->>''wins'')::numeric / ((ctx->>''wins'')::int + (ctx->>''losses'')::int) <= 0.25 and coalesce(p.age, 24) >= 25 then
    neg := neg - 0.5; rs := rs || jsonb_build_object(''icon'', ''😤'', ''v'', -0.5, ''text'', ''Sick of losing every week'');
  end if;
  if fav then pos := pos + 1.1;');
  if d not like '%2.4 then ''excited''%' or d not like '%Sick of losing%' then raise exception 'mood_calc patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.toggle_trade_block(text)'::regprocedure);
  d := replace(d, '  if exists (select 1 from public.trade_block where player_id = p_player) then delete',
'  if exists (select 1 from public.trade_requests where player_id = p_player and status = ''open'') then
    raise exception ''He asked for a trade, so he stays on the block until he''''s traded''; end if;
  if exists (select 1 from public.trade_block where player_id = p_player) then delete');
  if d not like '%stays on the block%' then raise exception 'toggle_trade_block patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.toggle_untouchable(text)'::regprocedure);
  d := replace(d, '  if (select count(*) from public.untouchables where team_id = me) >=',
'  if exists (select 1 from public.trade_requests where player_id = p_player and status = ''open'') then
    raise exception ''He asked for a trade. He can''''t be untouchable.''; end if;
  if (select count(*) from public.untouchables where team_id = me) >=');
  if d not like '%be untouchable.%' then raise exception 'toggle_untouchable patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.bot_refresh_blocks()'::regprocedure);
  d := replace(d, '    delete from public.trade_block where team_id = tm.team_id;',
'    delete from public.trade_block where team_id = tm.team_id
      and not exists (select 1 from public.trade_requests r where r.player_id = trade_block.player_id and r.status = ''open'');');
  d := replace(d, '      and not exists (select 1 from public.untouchables u where u.player_id = p.id)',
'      and not exists (select 1 from public.untouchables u where u.player_id = p.id)
      and not exists (select 1 from public.trade_block b2 where b2.player_id = p.id)');
  if d not like '%trade_requests r where r.player_id = trade_block.player_id%' or d not like '%b2.player_id = p.id%' then raise exception 'bot_refresh_blocks patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.bot_eval_trade(bigint)'::regprocedure);
  d := replace(d, 'star_in boolean := false;', 'star_in boolean := false; wants_out boolean := false;');
  d := replace(d, '      v := public.bot_player_value(it.player_id, me, md, br, it.side = ''get'');',
'      v := public.bot_player_value(it.player_id, me, md, br, it.side = ''get'');
      if it.side = ''get'' and exists (select 1 from public.trade_requests r where r.player_id = it.player_id and r.status = ''open'') then v := v * 0.75; wants_out := true; end if;');
  d := replace(d, '  if ok then reasons := array_append(reasons, ''That works for what we''''re building.''::text);',
'  if wants_out then reasons := array_append(reasons, ''He asked for a trade, so we''''ll take a bit less for him.''::text); end if;
  if ok then reasons := array_append(reasons, ''That works for what we''''re building.''::text);');
  if d not like '%wants_out := true%' or d not like '%if wants_out then%' then raise exception 'bot_eval_trade patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.execute_trade(bigint, text)'::regprocedure);
  d := replace(d, '      delete from public.trade_block where player_id = it.player_id;',
'      delete from public.trade_block where player_id = it.player_id;
      if exists (select 1 from public.trade_requests where player_id = it.player_id and status = ''open'') then
        update public.trade_requests set status = ''traded'', closed_at = now(), note = ''Got his wish'' where player_id = it.player_id and status = ''open'';
        update public.players set mood = ''happy'' where id = it.player_id;
        update public.player_morale set rolled_for = null, mood_since = now() where player_id = it.player_id;
      end if;');
  if d not like '%Got his wish%' then raise exception 'execute_trade patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.advance_week()'::regprocedure);
  d := replace(d, 'declare wk int; bots jsonb;', 'declare wk int; bots jsonb; mor jsonb; cut int;');
  d := replace(d, '  update public.league_settings set value = to_jsonb(wk) where key = ''current_week'';',
'  update public.league_settings set value = to_jsonb(wk) where key = ''current_week'';
  cut := public.trade_request_deadline();
  mor := public.refresh_morale(true);');
  d := replace(d, '  return jsonb_build_object(''week'', wk, ''bots'', bots);', '  return jsonb_build_object(''week'', wk, ''bots'', bots, ''morale'', mor, ''cut'', cut);');
  if d not like '%refresh_morale(true)%' or d not like '%''cut'', cut%' then raise exception 'advance_week patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
  d := replace(d, '  update public.league_settings set value = to_jsonb(case when step = 4 then 0 else step + 1 end) where key = ''offseason_step'';',
'  perform public.refresh_morale(step in (2, 4));
  update public.league_settings set value = to_jsonb(case when step = 4 then 0 else step + 1 end) where key = ''offseason_step'';');
  if d not like '%refresh_morale(step in (2, 4))%' then raise exception 'advance_offseason_core patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.auto_tick()'::regprocedure);
  d := replace(d, 'begin
  for r in select * from public.league_schedule',
'begin
  begin perform public.trade_request_deadline(); exception when others then null; end;
  for r in select * from public.league_schedule');
  if d not like '%trade_request_deadline()%' then raise exception 'auto_tick patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.commish_update_player(text, jsonb)'::regprocedure);
  d := replace(d, '  if p ? ''height_in'' then',
'  if p ? ''mood'' then
    if p->>''mood'' not in (''angry'', ''unhappy'', ''normal'', ''happy'', ''excited'') then raise exception ''Unknown mood''; end if;
    update public.players set mood = p->>''mood'' where id = pl.id;
    insert into public.player_morale (player_id, mood_since) values (pl.id, now()) on conflict (player_id) do update set mood_since = now(), rolled_for = null;
    changes := array_append(changes, ''mood''::text); end if;
  if p ? ''height_in'' then');
  if d not like '%Unknown mood%' then raise exception 'commish_update_player patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.set_league_number(text, integer)'::regprocedure);
  d := replace(d, '(''regression_from_season'', 1, 99),', '(''regression_from_season'', 1, 99), (''trade_request_angry_pct'', 0, 100), (''trade_request_unhappy_pct'', 0, 100),');
  if d not like '%trade_request_angry_pct%' then raise exception 'set_league_number patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '    (''player_moves'',', '    (''player_morale'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.player_morale t)),
    (''trade_requests'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.trade_requests t)),
    (''player_moves'',');
  if d not like '%from public.trade_requests t%' then raise exception 'sandbox_enter patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  delete from public.player_moves where true;', '  delete from public.player_morale where true;
  delete from public.trade_requests where true;
  delete from public.player_moves where true;');
  d := replace(d, '  insert into public.player_moves overriding system value select * from jsonb_populate_recordset(null::public.player_moves, b);',
'  insert into public.player_moves overriding system value select * from jsonb_populate_recordset(null::public.player_moves, b);
  select coalesce((select rows from public.sandbox_backup where name = ''player_morale''), ''[]'') into b;
  insert into public.player_morale select * from jsonb_populate_recordset(null::public.player_morale, b);
  select coalesce((select rows from public.sandbox_backup where name = ''trade_requests''), ''[]'') into b;
  insert into public.trade_requests select * from jsonb_populate_recordset(null::public.trade_requests, b);');
  if d not like '%delete from public.trade_requests%' or d not like '%null::public.trade_requests%' then raise exception 'sandbox_exit patch failed'; end if;
  execute d;
end $do$;

-- Fill every player's target mood and reasons now (moods themselves don't move until the next check).
select public.refresh_morale(false);
