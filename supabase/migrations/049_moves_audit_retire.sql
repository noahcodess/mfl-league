-- 049: player move history (trades, past ones loaded from the Discord trade posts), the data audit that reports
-- problems to the commissioner's inbox (replaces the Data Check page), and retirement at 26 or 27.

create table if not exists public.player_moves (
  id bigserial primary key,
  player_id text not null references public.players(id) on delete cascade,
  from_team text, to_team text,
  kind text not null default 'trade',
  happened_at timestamptz not null default now(),
  season int, trade_id bigint, note text
);
create index if not exists player_moves_player on public.player_moves (player_id);
alter table public.player_moves enable row level security;
drop policy if exists player_moves_read on public.player_moves;
create policy player_moves_read on public.player_moves for select using (true);

-- Past trades (from the commissioner's trade posts), for players still in the league.
insert into public.player_moves (player_id, from_team, to_team, happened_at, note)
select v.pid, v.f, v.t, v.at::timestamptz, v.note from (values
  ('ddc-05','void','ddc','2024-05-03 18:17','Traded with SS Mason Cervantes and a Season 3 4th-round pick for DE William Hernandez'),
  ('void-15','ddc','void','2024-05-03 18:17','Traded for TE Michael Wilson, SS Mason Cervantes and a Season 3 4th-round pick'),
  ('snm-13','void','wrf','2024-05-03 18:51','Traded for a Season 3 2nd-round pick'),
  ('snm-12','wsl','snm','2024-05-04 12:57','Traded for SS John James and a Season 3 4th-round pick'),
  ('void-18','tga','void','2024-05-05 11:01','Traded with a Season 3 3rd-round pick for LB Liam Arrendondo and RB Lucas Reyes'),
  ('tga-18','void','tga','2024-05-05 11:01','Traded with RB Lucas Reyes for LB Tristian Castillo and a Season 3 3rd-round pick'),
  ('tga-06','void','tga','2024-05-05 11:01','Traded with LB Liam Arrendondo for LB Tristian Castillo and a Season 3 3rd-round pick'),
  ('edc-01','void','edc','2024-06-29 20:56','Traded with a Season 3 2nd-round pick for a Season 3 1st-round pick'),
  ('wsl-15','snm','wsl','2024-09-15 21:28','Traded with QB Jackson Taylor for DE Andrew Reyes and a Season 4 3rd-round pick'),
  ('dst-14','wsl','snm','2024-09-15 21:28','Traded with a Season 4 3rd-round pick (on a 1-year, $100K deal) for QB Jackson Taylor and DE Luis Boyd'),
  ('tga-01','ddc','tga','2025-11-10 19:54','Traded for QB Simon Emery, WR Ray Doyle and a Season 8 1st-round pick'),
  ('ddc-01','tga','ddc','2025-11-10 19:54','Traded with WR Ray Doyle and a Season 8 1st-round pick for QB Kenneth Chase'),
  ('ddc-02','tga','ddc','2025-11-10 19:54','Traded with QB Simon Emery and a Season 8 1st-round pick for QB Kenneth Chase'),
  ('drf-01','void','drf','2025-11-10 20:54','Traded for a Season 7 1st, a Season 8 1st and a Season 8 2nd-round pick'),
  ('wrf-12','wrf','snm','2025-11-11 19:50','Traded for a Season 7 2nd, a Season 8 1st and a Season 8 2nd-round pick'),
  ('snm-13','wrf','snm','2025-11-11 20:07','Traded for DT Christopher Diaz and a Season 9 2nd-round pick'),
  ('wrf-12','snm','wrf','2025-11-11 20:07','Sent back with a Season 9 2nd-round pick for DT Ryan Cisneros'),
  ('crf-16','wrf','crf','2025-11-24 11:52','Traded for CB Arnold Christian and a Season 7 1st-round pick'),
  ('wrf-16','crf','wrf','2025-11-24 11:52','Traded with a Season 7 1st-round pick for CB Lucas Leon'),
  ('dst-14','snm','dst','2026-06-15 17:09','Traded for the Desert Spiders'' Season 10 1st-round pick'),
  ('ocm-02','void','ocm','2026-06-17 16:16','Traded for Ocean Monument''s Season 7 1st and Season 8 2nd-round picks'),
  ('drf-17','snm','drf','2026-06-18 21:03','Traded for Dark Forest''s Season 11 1st-round pick and CB Jamari Ford (cut right away)')
) v(pid, f, t, at, note)
where exists (select 1 from public.players p where p.id = v.pid)
  and not exists (select 1 from public.player_moves m where m.player_id = v.pid and m.happened_at = v.at::timestamptz);

-- New trades write their own history line.
do $do$
declare d text := pg_get_functiondef('public.execute_trade(bigint,text)'::regprocedure);
begin
  d := replace(d, '      perform public.join_team(it.player_id, newteam);',
    '      perform public.join_team(it.player_id, newteam);
      insert into public.player_moves (player_id, from_team, to_team, kind, season, trade_id, note)
      values (it.player_id, case when it.side = ''give'' then t.from_team else t.to_team end, newteam, ''trade'', public.setting_int(''current_season''), t.id,
        ''Traded for '' || public.trade_summary(t.id, case when it.side = ''give'' then ''get'' else ''give'' end));');
  if d not like '%player_moves%' then raise exception 'execute_trade patch failed'; end if;
  execute d;
  -- TEST mode backs up and restores move history too
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '    (''number_requests'',', '    (''player_moves'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.player_moves t)),
    (''number_requests'',');
  if d not like '%player_moves%' then raise exception 'sandbox_enter patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  delete from public.number_requests where true;', '  delete from public.player_moves where true;
  delete from public.number_requests where true;');
  d := replace(d, '  insert into public.players select * from jsonb_populate_recordset(null::public.players, b);',
    '  insert into public.players select * from jsonb_populate_recordset(null::public.players, b);
  select coalesce((select rows from public.sandbox_backup where name = ''player_moves''), ''[]'') into b;
  insert into public.player_moves overriding system value select * from jsonb_populate_recordset(null::public.player_moves, b);');
  if d not like '%delete from public.player_moves%' or d not like '%null::public.player_moves%' then raise exception 'sandbox_exit patch failed'; end if;
  execute d;
end $do$;

-- Retirement: only at 26 or 27. After birthdays, a 27 has a real chance to retire, a 26 a small one; anyone past 27 always does.
-- Better players hang on a little longer.
insert into public.league_settings (key, value) values ('retire_chance_26', '0.05'), ('retire_chance_27', '0.2') on conflict (key) do nothing;
do $do$
declare d text := pg_get_functiondef('public.advance_offseason()'::regprocedure);
begin
  d := replace(d, 'for r in select id, name, team_id, age, stars from public.players where status <> ''retired'' and age > max_age and age < 60 loop',
    'for r in select id, name, team_id, age, stars from public.players where status in (''active'', ''free_agent'') and age < 60 and (age > max_age
        or (age = max_age and random() < coalesce((select (value #>> ''{}'')::numeric from public.league_settings where key = ''retire_chance_27''), 0.2) * case when stars >= 4.5 then 0.6 when stars <= 3 then 1.3 else 1 end)
        or (age = max_age - 1 and random() < coalesce((select (value #>> ''{}'')::numeric from public.league_settings where key = ''retire_chance_26''), 0.05) * case when stars >= 4.5 then 0.6 when stars <= 3 then 1.3 else 1 end)) loop');
  if d not like '%retire_chance_27%' then raise exception 'retire patch failed'; end if;
  execute d;
end $do$;

-- The data audit: anything wrong with the league goes to the commissioner's inbox (only new problems, so no spam).
create or replace function public.data_audit() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare issues text[] := '{}'; r record; nd int := public.next_draft_season(); prev text[]; fresh text[];
  mx int := public.setting_int('max_roster'); cap int := public.setting_int('cap_limit');
begin
  for r in select p.name, upper(p.team_id) t from public.players p where p.status = 'active' and (p.age is null or p.stars is null) loop
    issues := issues || format('%s (%s) is missing an age or star rating', r.name, r.t); end loop;
  for r in select p.name, upper(p.team_id) t from public.players p where p.status = 'active'
           and not exists (select 1 from public.contracts c where c.player_id = p.id and c.status = 'active')
           and public.setting_int('offseason_step') not in (2, 3) loop
    issues := issues || format('%s (%s) is on a roster with no contract', r.name, r.t); end loop;
  for r in select upper(id) t, public.team_roster_count(id) n from public.teams where public.team_roster_count(id) > mx loop
    issues := issues || format('%s has %s players (max %s)', r.t, r.n, mx); end loop;
  for r in select upper(id) t, public.team_cap_committed(id) c from public.teams where public.team_cap_committed(id) > cap loop
    issues := issues || format('%s is over the cap ($%sK committed)', r.t, r.c / 1000); end loop;
  for r in select s.season, g.round, count(k.id) n, count(distinct upper(k.original_code)) codes
           from generate_series(nd, nd + 3) s(season) cross join generate_series(1, 3) g(round)
           left join public.picks k on k.season = s.season and k.round = g.round group by 1, 2
           having count(k.id) <> 16 or count(distinct upper(k.original_code)) <> 16 loop
    issues := issues || format('Season %s round %s has %s picks (should be 16, one per team)', r.season, r.round, r.n); end loop;
  for r in select k.season, k.round, k.original_code from public.picks k where upper(k.original_code) not in (select upper(code) from public.teams) loop
    issues := issues || format('A Season %s round %s pick has an unknown team code (%s)', r.season, r.round, r.original_code); end loop;
  for r in select upper(team_id) t, number from public.players where status = 'active' and number is not null group by 1, 2 having count(*) > 1 loop
    issues := issues || format('%s has two players wearing #%s', r.t, r.number); end loop;

  select coalesce((select array(select jsonb_array_elements_text(value)) from public.league_settings where key = 'audit_last'), '{}') into prev;
  select coalesce(array_agg(x), '{}') into fresh from unnest(issues) x where not (x = any(prev));
  insert into public.league_settings (key, value) values ('audit_last', to_jsonb(issues)) on conflict (key) do update set value = excluded.value;
  if array_length(fresh, 1) > 0 then
    perform public.notify(null, true, false, 'data_issue', format('Data check: %s new problem%s', array_length(fresh, 1), case when array_length(fresh, 1) = 1 then '' else 's' end),
      array_to_string(fresh, ' · '), jsonb_build_object('issues', to_jsonb(fresh)));
  end if;
  return jsonb_build_object('issues', to_jsonb(issues), 'new', to_jsonb(fresh));
end $$;

-- Run the audit after every offseason step and every game week.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  d := replace(d, '  return jsonb_build_object(''step'', names[step + 1], ''affected'', n);',
    '  perform public.data_audit();
  return jsonb_build_object(''step'', names[step + 1], ''affected'', n);');
  if d not like '%data_audit%' then raise exception 'advance audit patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.advance_week()'::regprocedure);
  d := replace(d, '  return jsonb_build_object(''week'', wk, ''bots'', bots);', '  perform public.data_audit();
  return jsonb_build_object(''week'', wk, ''bots'', bots);');
  if d not like '%data_audit%' then raise exception 'week audit patch failed'; end if;
  execute d;
end $do$;

select public.bot_refresh_modes();
select public.data_audit();
