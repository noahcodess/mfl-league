-- TEST mode can start the draft at any step (for testing); the real league still needs free agency done.
-- The schedule can be set for this season or the next one, and dates must stay in calendar order
-- (next season's offseason can't start before this season's games are over).

do $$
declare d text;
begin
  d := pg_get_functiondef('public.draft_start()'::regprocedure);
  d := replace(d, '  if (select value #>> ''{}'' from public.league_settings where key = ''phase'') <> ''offseason'' or public.setting_int(''offseason_step'') <> 3 then',
    '  if (select value #>> ''{}'' from public.league_settings where key = ''sandbox'') = ''true'' then
    null; -- TEST mode: start whenever, so the draft can be tested without playing through the offseason
  elsif (select value #>> ''{}'' from public.league_settings where key = ''phase'') <> ''offseason'' or public.setting_int(''offseason_step'') <> 3 then');
  d := replace(d, '  if public.setting_int(''fa_round'') < public.setting_int(''fa_rounds'') then',
    '  if (select value #>> ''{}'' from public.league_settings where key = ''sandbox'') <> ''true'' and public.setting_int(''fa_round'') < public.setting_int(''fa_rounds'') then');
  execute d;
end $$;

-- Calendar order of a season's events.
create or replace function public.schedule_order(p_kind text) returns int language sql immutable set search_path = '' as $$
  select array_position(array['birthday', 'resign', 'fa_open', 'fa_round_1', 'fa_round_2', 'fa_round_3', 'fa_round_4',
    'draft', 'camp', 'season_start', 'craft_bowl'], p_kind)
$$;

create or replace function public.set_schedule_for(p_season int, p_kind text, p_label text, p_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cur int := public.setting_int('current_season'); ord int := public.schedule_order(p_kind); clash record; nice text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if ord is null or coalesce(length(p_label), 0) not between 2 and 60 then raise exception 'Bad event'; end if;
  if p_season not in (cur, cur + 1) then raise exception 'You can schedule Season % or Season % only', cur, cur + 1; end if;
  if p_at is null then
    delete from public.league_schedule where season = p_season and kind = p_kind;
    perform public.log_event('schedule', null, null, format('📅 Season %s %s no longer has a date', p_season, p_label), jsonb_build_object('kind', p_kind, 'season', p_season, 'at', null));
    return jsonb_build_object('cleared', p_kind);
  end if;
  if p_at < now() then raise exception 'Pick a time in the future'; end if;
  select label, starts_at into clash from public.league_schedule
    where season = p_season and kind <> p_kind and public.schedule_order(kind) < ord and starts_at >= p_at order by starts_at desc limit 1;
  if found then raise exception '% has to come after % (%)', p_label, clash.label, to_char(clash.starts_at at time zone 'America/New_York', 'Mon FMDD FMHH12:MI AM'); end if;
  select label, starts_at into clash from public.league_schedule
    where season = p_season and kind <> p_kind and public.schedule_order(kind) > ord and starts_at <= p_at order by starts_at limit 1;
  if found then raise exception '% has to come before % (%)', p_label, clash.label, to_char(clash.starts_at at time zone 'America/New_York', 'Mon FMDD FMHH12:MI AM'); end if;
  select label, starts_at into clash from public.league_schedule where season = p_season - 1 and starts_at >= p_at order by starts_at desc limit 1;
  if found then raise exception 'Season % events have to come after Season % is over (% is %)', p_season, p_season - 1, clash.label,
    to_char(clash.starts_at at time zone 'America/New_York', 'Mon FMDD FMHH12:MI AM'); end if;
  insert into public.league_schedule (season, kind, label, starts_at, updated_by) values (p_season, p_kind, p_label, p_at, auth.uid())
  on conflict (season, kind) do update set label = excluded.label, starts_at = excluded.starts_at, updated_at = now(), updated_by = auth.uid();
  nice := to_char(p_at at time zone 'America/New_York', 'Dy, Mon FMDD "at" FMHH12:MI AM') || ' ET';
  perform public.log_event('schedule', null, null, format('📅 %s%s: %s', case when p_season > cur then format('Season %s ', p_season) else '' end, p_label, nice),
    jsonb_build_object('kind', p_kind, 'season', p_season, 'at', p_at, 'label', p_label));
  return jsonb_build_object('kind', p_kind, 'season', p_season, 'at', p_at);
end $$;

revoke execute on function public.schedule_order(text) from public, anon;
grant execute on function public.schedule_order(text) to authenticated;
revoke execute on function public.set_schedule_for(int, text, text, timestamptz) from public, anon;
grant execute on function public.set_schedule_for(int, text, text, timestamptz) to authenticated;
