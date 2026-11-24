-- 101: Rookie of the Year becomes Offensive and Defensive Rookie of the Year, plus Comeback Player of the Year. An award
-- with no candidates (Comeback needs last season on the site) is simply not given that season; one with 1 or 2 still
-- needs 3 before the finalists can be confirmed. The Live feed lists finalists in a shuffled order that stays the same
-- (not by name). TEST-mode awards and ceremonies are wiped whenever TEST mode turns on or off, so every test session
-- starts clean, like the rest of TEST mode.
create or replace function public.lock_award_finalists(p_season int) returns jsonb language plpgsql security definer set search_path to '' as $$
declare keys text[] := array['mvp', 'opoy', 'dpoy', 'oroy', 'droy', 'cpoy', 'coy', 'goty']; n int; bad int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select count(*), count(*) filter (where jsonb_array_length(entries) between 1 and 2) into n, bad
    from public.season_awards where season = p_season and in_test = public.in_sandbox() and award = any(keys);
  if n < array_length(keys, 1) then raise exception 'Open the Awards tab first so every award has its list'; end if;
  if bad > 0 then raise exception 'An award has only 1 or 2 finalists: add a 3rd (or clear it to skip the award this season)'; end if;
  insert into public.award_ceremony (season, in_test, locked_at) values (p_season, public.in_sandbox(), now())
  on conflict (season, in_test) do update set locked_at = coalesce(public.award_ceremony.locked_at, now());
  perform public.log_event('awards', null, null, format('Season %s award finalists are in', p_season), jsonb_build_object('season', p_season));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.award_show_state(p_season int) returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare c public.award_ceremony; boss boolean := public.is_commissioner(); fin jsonb; win jsonb; shown boolean;
begin
  select * into c from public.award_ceremony where season = p_season and in_test = public.in_sandbox();
  if c.locked_at is not null then   -- shuffled, and the same shuffle every time (nothing about the order gives the winner away)
    select jsonb_object_agg(a.award, (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'team', x->>'team', 'pos', x->>'pos', 'line', x->>'line') order by md5(a.season || a.award || (x->>'id'))), '[]'::jsonb)
      from jsonb_array_elements(a.entries) with ordinality t(x, i) where i <= 3)) into fin
    from public.season_awards a where a.season = p_season and a.in_test = public.in_sandbox() and jsonb_array_length(a.entries) > 0;
  end if;
  shown := c.finished_at is not null and (boss or now() >= c.finished_at + interval '2 minutes');
  if shown or (boss and c.started_at is not null) then
    select jsonb_object_agg(a.award, (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'name', x->>'name', 'team', x->>'team', 'pos', x->>'pos', 'line', x->>'line') order by i), '[]'::jsonb)
      from jsonb_array_elements(a.entries) with ordinality t(x, i) where i <= 3)) into win
    from public.season_awards a where a.season = p_season and a.in_test = public.in_sandbox() and jsonb_array_length(a.entries) > 0;
  end if;
  return jsonb_build_object('season', p_season, 'show_at', c.show_at, 'locked', c.locked_at is not null, 'started', c.started_at is not null,
    'finished', c.finished_at is not null, 'finished_at', c.finished_at, 'revealed', shown, 'finalists', fin, 'winners', win);
end $$;

-- TEST mode turning on or off wipes the TEST awards and ceremony.
create or replace function public.reset_test_awards() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  delete from public.season_awards where in_test;
  delete from public.award_ceremony where in_test;
  return null;
end $$;
drop trigger if exists test_awards_reset on public.league_settings;
create trigger test_awards_reset after update of value on public.league_settings
  for each row when (new.key = 'sandbox' and old.value is distinct from new.value) execute function public.reset_test_awards();
