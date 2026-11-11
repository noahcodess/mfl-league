-- 048: coach sign-up by one-time passcode (stored only as a bcrypt hash), and game weeks: the commissioner's
-- "Go to next week" runs the bot week. The 7-day automatic bot run and the manual bot button are removed.

create table if not exists public.coach_invites (
  id bigserial primary key,
  coach_name text not null,
  team_id text not null references public.teams(id),
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz, used_by uuid, cancelled_at timestamptz
);
alter table public.coach_invites enable row level security; -- no policies: only the functions below touch it

create table if not exists public.join_attempts (at timestamptz not null default now());
alter table public.join_attempts enable row level security;

-- Commissioner: make a one-time passcode for "Coach <name>" on a team. The plain code is returned once and never stored.
create or replace function public.create_coach_invite(p_name text, p_team text) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare nm text := regexp_replace(trim(coalesce(p_name, '')), '^coach\s+', '', 'i'); abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  raw bytea := extensions.gen_random_bytes(12); code text := ''; i int; iid bigint; exp timestamptz;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if nm !~ '^[A-Za-z0-9][A-Za-z0-9 .''-]{1,19}$' then raise exception 'Name must be 2 to 20 letters or numbers (first name, Discord name or nickname)'; end if;
  if not exists (select 1 from public.teams where id = p_team) then raise exception 'Pick a team'; end if;
  if exists (select 1 from public.profiles where team_id = p_team and role = 'coach') then raise exception 'That team already has a coach'; end if;
  if exists (select 1 from public.coach_invites where team_id = p_team and used_at is null and cancelled_at is null and expires_at > now()) then
    raise exception 'That team already has a passcode waiting. Cancel it first to make a new one.'; end if;
  for i in 0..11 loop
    code := code || substr(abc, 1 + get_byte(raw, i) % length(abc), 1);
    if i in (3, 7) then code := code || '-'; end if;
  end loop;
  insert into public.coach_invites (coach_name, team_id, code_hash) values (nm, p_team, extensions.crypt(code, extensions.gen_salt('bf', 8)))
    returning id, expires_at into iid, exp;
  return jsonb_build_object('id', iid, 'code', code, 'coach_name', nm, 'team_id', p_team, 'expires_at', exp);
end $$;

create or replace function public.list_coach_invites() returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when public.is_commissioner() or public.is_site_owner() then coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'coach_name', coach_name, 'team_id', team_id, 'created_at', created_at, 'expires_at', expires_at) order by created_at desc)
    from public.coach_invites where used_at is null and cancelled_at is null and expires_at > now()), '[]') else '[]' end
$$;

create or replace function public.cancel_coach_invite(p_id bigint) returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.coach_invites set cancelled_at = now() where id = p_id and used_at is null;
end $$;

-- Server only (join-league function): which open invite matches this code? Slows down guessing league-wide.
create or replace function public.invite_lookup(p_code text) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); r record;
begin
  if (select count(*) from public.join_attempts where at > now() - interval '15 minutes') >= 30 then
    raise exception 'Too many tries. Wait 15 minutes and try again.'; end if;
  if length(c) = 12 then
    c := substr(c, 1, 4) || '-' || substr(c, 5, 4) || '-' || substr(c, 9, 4);
    for r in select i.id, i.coach_name, i.team_id, t.name team_name from public.coach_invites i join public.teams t on t.id = i.team_id
             where i.used_at is null and i.cancelled_at is null and i.expires_at > now() loop
      if extensions.crypt(c, (select code_hash from public.coach_invites where id = r.id)) = (select code_hash from public.coach_invites where id = r.id) then
        return jsonb_build_object('id', r.id, 'coach_name', r.coach_name, 'team_id', r.team_id, 'team_name', r.team_name);
      end if;
    end loop;
  end if;
  insert into public.join_attempts default values;
  delete from public.join_attempts where at < now() - interval '1 day';
  raise exception 'That passcode didn''t work. Check it with the commissioner (it works once and expires after 14 days).';
end $$;

-- Server only: the coach made his login. Close the invite, hand him the team's coach seat, and tell the league.
create or replace function public.invite_complete(p_id bigint, p_user uuid) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare inv public.coach_invites;
begin
  update public.coach_invites set used_at = now(), used_by = p_user where id = p_id and used_at is null returning * into inv;
  if inv.id is null then raise exception 'That passcode was already used'; end if;
  if exists (select 1 from public.coaches where team_id = inv.team_id) then
    update public.coaches set name = inv.coach_name, potential = 5, ratings = public.make_coach_ratings(inv.team_id, 3),
      brain = public.make_bot_brain(inv.team_id, 'steady'), plan = null, updated_at = now() where team_id = inv.team_id;
  else
    perform public.ensure_coaches();
  end if;
  perform public.notify(null, false, true, 'coach_joined', format('Coach %s joined the %s', inv.coach_name, (select name from public.teams where id = inv.team_id)),
    'Welcome to the MFL!', jsonb_build_object('team', inv.team_id));
end $$;

revoke execute on function public.invite_lookup(text) from public, anon, authenticated;
revoke execute on function public.invite_complete(bigint, uuid) from public, anon, authenticated;
grant execute on function public.invite_lookup(text) to service_role;
grant execute on function public.invite_complete(bigint, uuid) to service_role;

-- Game weeks. Week 1 starts with the regular season; "Go to next week" runs the bot week.
insert into public.league_settings (key, value) values ('current_week', '0') on conflict (key) do nothing;

create or replace function public.advance_week() returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare wk int; bots jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'phase') <> 'regular_season' then
    raise exception 'Game weeks start when the regular season begins'; end if;
  bots := public.bot_weekly();
  wk := coalesce(public.setting_int('current_week'), 1) + 1;
  update public.league_settings set value = to_jsonb(wk) where key = 'current_week';
  perform public.log_event('week', null, null, format('Week %s is here', wk), jsonb_build_object('week', wk, 'bots', bots));
  perform public.notify(null, false, true, 'week', format('Week %s is here', wk), 'Check your matchup and your inbox.', jsonb_build_object('week', wk));
  return jsonb_build_object('week', wk, 'bots', bots);
end $$;

drop function if exists public.bot_run_week();

do $do$
declare d text;
begin
  -- bot week no longer runs on a 7-day timer
  d := pg_get_functiondef('public.bot_tick()'::regprocedure);
  d := regexp_replace(d, '  if coalesce\(\(select \(value #>> ''\{\}''\)::timestamptz.*?perform public\.bot_weekly\(\);\n  end if;\n', '', 's');
  if d like '%bot_weekly%' then raise exception 'tick patch failed'; end if;
  execute d;
  -- the regular season starts at Week 1
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  d := replace(d, '    update public.league_settings set value = ''"regular_season"'' where key = ''phase'';',
    '    update public.league_settings set value = ''"regular_season"'' where key = ''phase'';
    update public.league_settings set value = ''1'' where key = ''current_week'';');
  if d not like '%current_week%' then raise exception 'advance patch failed'; end if;
  execute d;
end $do$;
