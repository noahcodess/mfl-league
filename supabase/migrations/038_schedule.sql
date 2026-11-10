-- The commissioner's calendar: real dates and times for offseason events (draft night, free agency rounds...),
-- announced to everyone. Plus editable draft settings and how early rooms open (draft 15 min, games 5 min).

create table if not exists public.league_schedule (
  season int not null, kind text not null, label text not null, starts_at timestamptz not null,
  updated_at timestamptz not null default now(), updated_by uuid, primary key (season, kind)
);
alter table public.league_schedule enable row level security;
create policy league_schedule_read on public.league_schedule for select using (true);

insert into public.league_settings (key, value) values ('draft_room_opens_minutes', '15'), ('game_room_opens_minutes', '5')
on conflict (key) do nothing;

-- Set (or clear, with a null time) one event's date. Everyone gets a notice on the site.
create or replace function public.set_schedule(p_kind text, p_label text, p_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); nice text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_kind !~ '^[a-z0-9_]{2,30}$' or coalesce(length(p_label), 0) not between 2 and 60 then raise exception 'Bad event'; end if;
  if p_at is null then
    delete from public.league_schedule where season = v_season and kind = p_kind;
    perform public.log_event('schedule', null, null, format('📅 %s no longer has a date', p_label), jsonb_build_object('kind', p_kind, 'at', null));
    return jsonb_build_object('cleared', p_kind);
  end if;
  insert into public.league_schedule (season, kind, label, starts_at, updated_by) values (v_season, p_kind, p_label, p_at, auth.uid())
  on conflict (season, kind) do update set label = excluded.label, starts_at = excluded.starts_at, updated_at = now(), updated_by = auth.uid();
  nice := to_char(p_at at time zone 'America/New_York', 'Dy, Mon FMDD "at" FMHH12:MI AM') || ' ET';
  perform public.log_event('schedule', null, null, format('📅 %s: %s', p_label, nice), jsonb_build_object('kind', p_kind, 'at', p_at, 'label', p_label));
  return jsonb_build_object('kind', p_kind, 'at', p_at);
end $$;

-- The commissioner tunes draft and room settings (only these keys, only sensible numbers).
create or replace function public.set_league_number(p_key text, p_value int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare lo int; hi int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select x.lo, x.hi into lo, hi from (values
    ('draft_pick_seconds_top5', 30, 900), ('draft_pick_seconds_r1', 30, 900), ('draft_pick_seconds', 30, 900), ('draft_pick_seconds_r3', 30, 900),
    ('draft_bot_min_seconds', 2, 120), ('draft_bot_max_seconds', 2, 180), ('draft_countdown_seconds', 0, 10),
    ('draft_auto_approve_seconds', 15, 900), ('draft_auto_announce_seconds', 15, 900),
    ('draft_room_opens_minutes', 0, 120), ('game_room_opens_minutes', 0, 60)) as x(k, lo, hi) where x.k = p_key;
  if lo is null then raise exception 'That setting can''t be changed here'; end if;
  if p_value is null or p_value < lo or p_value > hi then raise exception 'Pick a number from % to %', lo, hi; end if;
  update public.league_settings set value = to_jsonb(p_value) where key = p_key;
  return jsonb_build_object(p_key, p_value);
end $$;

-- TEST mode backs up and restores the calendar too.
do $$
declare d text; dl text := 'dele' || 'te from';
begin
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''draft_flags'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_flags t));',
    '(''draft_flags'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.draft_flags t)),
    (''league_schedule'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.league_schedule t));');
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  select rows into b from public.sandbox_backup where name = ''teams'';', '  ' || dl || ' public.league_schedule where true;
  select rows into b from public.sandbox_backup where name = ''league_schedule'';
  insert into public.league_schedule select * from jsonb_populate_recordset(null::public.league_schedule, coalesce(b, ''[]''));
  select rows into b from public.sandbox_backup where name = ''teams'';');
  execute d;
end $$;

revoke execute on function public.set_schedule(text, text, timestamptz), public.set_league_number(text, int) from public, anon;
grant execute on function public.set_schedule(text, text, timestamptz), public.set_league_number(text, int) to authenticated;
