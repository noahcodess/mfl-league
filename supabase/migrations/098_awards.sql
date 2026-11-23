-- 098: season awards. season_awards keeps each award's ranked list (top 5; the top 3 are the finalists people see), as the
-- numbers had it or as the commissioner reordered it. Only the commissioner sees a season's lists while it's going on (no
-- spoilers); everyone can read a finished season's. coach_activity counts how active each coach is (days and minutes on
-- the site, one row per coach per day) for Coach of the Year: nobody can read it directly, the commissioner only gets
-- each team's totals. awards_display_until: how long last season's awards stay on the League tab (-1 = not shown, 0-10 =
-- through the end of that week). Lists saved in TEST mode are kept apart from the real league's (in_test) and only show
-- while TEST mode is on.
create or replace function public.in_sandbox() returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select value #>> '{}' from public.league_settings where key = 'sandbox') = 'true', false) $$;
create table if not exists public.season_awards (
  season int not null,
  award text not null check (award in ('mvp', 'opoy', 'dpoy', 'roy', 'coy', 'goty')),
  entries jsonb not null default '[]'::jsonb,
  edited boolean not null default false,
  in_test boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (season, award, in_test)
);
alter table public.season_awards enable row level security;
drop policy if exists "finished seasons are public" on public.season_awards;
create policy "finished seasons are public" on public.season_awards for select to anon, authenticated
  using (in_test = public.in_sandbox() and (season < public.setting_int('current_season') or public.is_commissioner()));

create or replace function public.save_award(p_season int, p_award text, p_entries jsonb, p_edited boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 10 then raise exception 'Bad list'; end if;
  insert into public.season_awards (season, award, entries, edited, in_test, updated_at) values (p_season, p_award, p_entries, coalesce(p_edited, false), public.in_sandbox(), now())
  on conflict (season, award, in_test) do update set entries = excluded.entries, edited = excluded.edited, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.save_award(int, text, jsonb, boolean) from public, anon;
grant execute on function public.save_award(int, text, jsonb, boolean) to authenticated;

create table if not exists public.coach_activity (
  user_id uuid not null,
  team_id text,
  day date not null,
  minutes int not null default 0,
  last_ping timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.coach_activity enable row level security;   -- no policies: only the functions below touch it

-- A signed-in coach's browser calls this every few minutes while the site is open and in front of him.
create or replace function public.coach_ping() returns void language plpgsql security definer set search_path to '' as $$
declare me uuid := auth.uid(); t text; d date := (now() at time zone 'America/New_York')::date;
begin
  if me is null then return; end if;
  select team_id into t from public.profiles where user_id = me and role = 'coach';
  if t is null then return; end if;
  insert into public.coach_activity (user_id, team_id, day, minutes, last_ping) values (me, t, d, 5, now())
  on conflict (user_id, day) do update set team_id = excluded.team_id, last_ping = now(),
    minutes = least(1440, public.coach_activity.minutes + case when now() - public.coach_activity.last_ping >= interval '4 minutes' then 5 else 0 end);
end $$;
revoke all on function public.coach_ping() from public, anon;
grant execute on function public.coach_ping() to authenticated;

-- Each team's activity since a date: days active and minutes. Commissioner only.
create or replace function public.coach_activity_summary(p_since date)
returns table (team_id text, days int, minutes int) language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  return query select a.team_id, count(distinct a.day)::int, coalesce(sum(a.minutes), 0)::int from public.coach_activity a
    where a.day >= p_since and a.team_id is not null group by a.team_id;
end $$;
revoke all on function public.coach_activity_summary(date) from public, anon;
grant execute on function public.coach_activity_summary(date) to authenticated;

create or replace function public.set_awards_display(p_until int) returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_until < -1 or p_until > 10 then raise exception 'Pick a week from 0 to 10'; end if;
  insert into public.league_settings (key, value) values ('awards_display_until', to_jsonb(p_until))
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.set_awards_display(int) from public, anon;
grant execute on function public.set_awards_display(int) to authenticated;

-- 098b (applied separately): coach_ping is called with the presence heartbeat (every 30 seconds); it adds 4 minutes once
-- every 4 minutes.
create or replace function public.coach_ping() returns void language plpgsql security definer set search_path to '' as $$
declare me uuid := auth.uid(); t text; d date := (now() at time zone 'America/New_York')::date;
begin
  if me is null then return; end if;
  select team_id into t from public.profiles where user_id = me and role = 'coach';
  if t is null then return; end if;
  insert into public.coach_activity (user_id, team_id, day, minutes, last_ping) values (me, t, d, 4, now())
  on conflict (user_id, day) do update set team_id = excluded.team_id,
    minutes = least(1440, public.coach_activity.minutes + case when now() - public.coach_activity.last_ping >= interval '4 minutes' then 4 else 0 end),
    last_ping = case when now() - public.coach_activity.last_ping >= interval '4 minutes' then now() else public.coach_activity.last_ping end;
end $$;
