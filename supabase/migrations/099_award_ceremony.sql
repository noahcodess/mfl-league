-- 099: the award ceremony. After Week 12 the commissioner confirms each award's 3 finalists (they're permanent after
-- that; he can still change the order of those 3, which picks the winner, until the show starts) and sets the show's date.
-- The league can't go past Week 12 until the finalists are confirmed. award_show_state is what everyone reads: the date,
-- where the show is, the finalists (sorted by name, no scores, so nothing gives the winner away) and, 2 minutes after the
-- commissioner finishes the show, the winners. TEST-mode ceremonies are kept apart from the real league's (in_test).
create table if not exists public.award_ceremony (
  season int not null,
  in_test boolean not null default false,
  show_at timestamptz,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  primary key (season, in_test)
);
alter table public.award_ceremony enable row level security;   -- no policies: only the functions below touch it

create or replace function public.award_top3_ids(p jsonb) returns text language sql immutable set search_path to '' as $$
  select coalesce(string_agg(x->>'id', ',' order by x->>'id'), '') from jsonb_array_elements(coalesce(p, '[]'::jsonb)) with ordinality t(x, i) where i <= 3 $$;

-- Saving a list: once the finalists are confirmed, only the order of the same 3 can change, and nothing after the show starts.
create or replace function public.save_award(p_season int, p_award text, p_entries jsonb, p_edited boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c public.award_ceremony; old jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 10 then raise exception 'Bad list'; end if;
  select * into c from public.award_ceremony where season = p_season and in_test = public.in_sandbox();
  if c.started_at is not null then raise exception 'The show has started, so the awards are set'; end if;
  if c.locked_at is not null then
    select entries into old from public.season_awards where season = p_season and award = p_award and in_test = public.in_sandbox();
    if public.award_top3_ids(old) <> public.award_top3_ids(p_entries) then raise exception 'The finalists are confirmed: you can only change the order of the top 3'; end if;
  end if;
  insert into public.season_awards (season, award, entries, edited, in_test, updated_at) values (p_season, p_award, p_entries, coalesce(p_edited, false), public.in_sandbox(), now())
  on conflict (season, award, in_test) do update set entries = excluded.entries, edited = excluded.edited, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.lock_award_finalists(p_season int) returns jsonb language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select count(*) into n from public.season_awards where season = p_season and in_test = public.in_sandbox() and jsonb_array_length(entries) >= 3
    and award in ('mvp', 'opoy', 'dpoy', 'roy', 'coy', 'goty');
  if n < 6 then raise exception 'Every award needs 3 finalists first (open each one on the Awards tab)'; end if;
  insert into public.award_ceremony (season, in_test, locked_at) values (p_season, public.in_sandbox(), now())
  on conflict (season, in_test) do update set locked_at = coalesce(public.award_ceremony.locked_at, now());
  perform public.log_event('awards', null, null, format('Season %s award finalists are in', p_season), jsonb_build_object('season', p_season));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_award_show_date(p_season int, p_at timestamptz) returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  insert into public.award_ceremony (season, in_test, show_at) values (p_season, public.in_sandbox(), p_at)
  on conflict (season, in_test) do update set show_at = excluded.show_at;
  return jsonb_build_object('ok', true);
end $$;

-- p_step: 'start' or 'finish'. 'reset' (TEST mode only) puts the show back to before it started, and unconfirms the finalists.
create or replace function public.award_show_step(p_season int, p_step text) returns jsonb language plpgsql security definer set search_path to '' as $$
declare c public.award_ceremony;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into c from public.award_ceremony where season = p_season and in_test = public.in_sandbox();
  if p_step = 'reset' then
    if not public.in_sandbox() then raise exception 'Only in TEST mode'; end if;
    update public.award_ceremony set locked_at = null, started_at = null, finished_at = null where season = p_season and in_test;
  elsif c.locked_at is null then raise exception 'Confirm the finalists first';
  elsif p_step = 'start' then update public.award_ceremony set started_at = coalesce(started_at, now()) where season = p_season and in_test = public.in_sandbox();
  elsif p_step = 'finish' then update public.award_ceremony set started_at = coalesce(started_at, now()), finished_at = coalesce(finished_at, now()) where season = p_season and in_test = public.in_sandbox();
  else raise exception 'Bad step'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Everyone: the show's date and status, the finalists once confirmed (by name, no scores), the winners once revealed.
create or replace function public.award_show_state(p_season int) returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare c public.award_ceremony; boss boolean := public.is_commissioner(); fin jsonb; win jsonb; shown boolean;
begin
  select * into c from public.award_ceremony where season = p_season and in_test = public.in_sandbox();
  if c.locked_at is not null then
    select jsonb_object_agg(a.award, (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'team', x->>'team', 'pos', x->>'pos', 'line', x->>'line') order by x->>'name'), '[]'::jsonb)
      from jsonb_array_elements(a.entries) with ordinality t(x, i) where i <= 3)) into fin
    from public.season_awards a where a.season = p_season and a.in_test = public.in_sandbox();
  end if;
  shown := c.finished_at is not null and (boss or now() >= c.finished_at + interval '2 minutes');
  if shown or (boss and c.started_at is not null) then
    select jsonb_object_agg(a.award, (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'team', x->>'team', 'pos', x->>'pos', 'line', x->>'line') order by i), '[]'::jsonb)
      from jsonb_array_elements(a.entries) with ordinality t(x, i) where i <= 3)) into win
    from public.season_awards a where a.season = p_season and a.in_test = public.in_sandbox();
  end if;
  return jsonb_build_object('season', p_season, 'show_at', c.show_at, 'locked', c.locked_at is not null, 'started', c.started_at is not null,
    'finished', c.finished_at is not null, 'finished_at', c.finished_at, 'revealed', shown, 'finalists', fin, 'winners', win);
end $$;

revoke all on function public.save_award(int, text, jsonb, boolean) from public, anon;
grant execute on function public.save_award(int, text, jsonb, boolean) to authenticated;
revoke all on function public.lock_award_finalists(int) from public, anon;
grant execute on function public.lock_award_finalists(int) to authenticated;
revoke all on function public.set_award_show_date(int, timestamptz) from public, anon;
grant execute on function public.set_award_show_date(int, timestamptz) to authenticated;
revoke all on function public.award_show_step(int, text) from public, anon;
grant execute on function public.award_show_step(int, text) to authenticated;
revoke all on function public.award_show_state(int) from public;
grant execute on function public.award_show_state(int) to anon, authenticated;

-- Going past Week 12 needs the finalists confirmed first.
create or replace function public.advance_week()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare wk int; bots jsonb; mor jsonb; cut int; depth int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'regular_season' then
    raise exception 'Game weeks start when the regular season begins'; end if;
  if coalesce(public.setting_int('current_week'), 1) >= 12 and not exists (select 1 from public.award_ceremony where season = public.setting_int('current_season')
      and in_test = public.in_sandbox() and locked_at is not null) then
    raise exception 'Confirm the award finalists first (Commissioner''s Desk → Awards)'; end if;
  bots := public.bot_weekly();
  wk := coalesce(public.setting_int('current_week'), 1) + 1;
  update public.league_settings set value = to_jsonb(wk) where key = 'current_week';
  update public.league_settings set value = to_jsonb(coalesce(public.setting_int('league_clock'), 0) + 1) where key = 'league_clock';
  cut := public.trade_request_deadline();
  mor := public.refresh_morale(true);
  depth := public.bot_set_depth_all();
  perform public.log_event('week', null, null, format('Week %s is here', wk), jsonb_build_object('week', wk, 'bots', bots, 'depth_moves', depth));
  perform public.notify(null, false, true, 'week', format('Week %s is here', wk), 'Check your matchup and your inbox.', jsonb_build_object('week', wk));
  perform public.data_audit();
  return jsonb_build_object('week', wk, 'bots', bots, 'morale', mor, 'cut', cut, 'depth', depth);
end $$;
