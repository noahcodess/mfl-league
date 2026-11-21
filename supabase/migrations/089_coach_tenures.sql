-- Who coaches each team, and since when. Every team has its own bot coach for good; when the commissioner gives the team to
-- a person, a human tenure starts (fans get a little hope), and when that person leaves the team's bot coach comes back.
-- Fan support reads this. It holds no personal details: just the team, human or bot, and the season and week it began.
-- Each team's bot coach is kept in bot_coaches while a person coaches the team, and put back exactly as he was when they leave.
create table if not exists public.coach_tenures (
  id bigserial primary key,
  team_id text not null references public.teams(id) on update cascade,
  human boolean not null,
  season int not null, week int not null default 0,
  started_at timestamptz not null default now(), ended_at timestamptz
);
create index if not exists coach_tenures_open on public.coach_tenures (team_id) where ended_at is null;
alter table public.coach_tenures enable row level security;
drop policy if exists "anyone reads coach tenures" on public.coach_tenures;
create policy "anyone reads coach tenures" on public.coach_tenures for select using (true);

create or replace function public.setting_int(p_key text, p_default int) returns int language sql stable security definer set search_path to '' as $$
  select coalesce((select (value #>> '{}')::int from public.league_settings where key = p_key), p_default)
$$;

-- Close the team's open tenure and start a new one.
-- Every team's own bot coach (name, looks, ratings, brain, scheme), saved while a person holds the seat.
create table if not exists public.bot_coaches (team_id text primary key references public.teams(id) on update cascade, coach jsonb not null, saved_at timestamptz not null default now());
alter table public.bot_coaches enable row level security;   -- server only: no policies
insert into public.bot_coaches (team_id, coach) select c.team_id, to_jsonb(c) from public.coaches c where public.is_bot_team(c.team_id) on conflict (team_id) do nothing;

-- The bot comes back: exactly as saved, or (a team that has always had a person) a brand-new bot who is then kept for good.
create or replace function public.restore_bot_coach(p_team text) returns void language plpgsql security definer set search_path to '' as $$
declare r public.coaches;
begin
  if not exists (select 1 from public.bot_coaches where team_id = p_team) then
    delete from public.coaches where team_id = p_team; perform public.ensure_coaches();
    insert into public.bot_coaches (team_id, coach) select c.team_id, to_jsonb(c) from public.coaches c where c.team_id = p_team on conflict (team_id) do nothing;
    return;
  end if;
  select * into r from jsonb_populate_record(null::public.coaches, (select coach from public.bot_coaches where team_id = p_team));
  update public.coaches set name = r.name, looks = r.looks, ratings = r.ratings, potential = r.potential, brain = r.brain, scheme = r.scheme, plan = r.plan, updated_at = now() where team_id = p_team;
end $$;
revoke execute on function public.restore_bot_coach(text) from public, anon, authenticated;

create or replace function public.start_tenure(p_team text, p_human boolean) returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_team is null then return; end if;
  if exists (select 1 from public.coach_tenures where team_id = p_team and ended_at is null and human = p_human) then return; end if;
  update public.coach_tenures set ended_at = now() where team_id = p_team and ended_at is null;
  insert into public.coach_tenures (team_id, human, season, week) values (p_team, p_human, public.setting_int('current_season', 1), public.setting_int('current_week', 0));
  if not p_human then perform public.restore_bot_coach(p_team); end if;
end $$;
revoke execute on function public.start_tenure(text, boolean) from public, anon, authenticated;

create or replace function public.profile_tenure() returns trigger language plpgsql security definer set search_path to '' as $$
declare old_team text := case when tg_op in ('UPDATE', 'DELETE') and old.role = 'coach' then old.team_id end;
        new_team text := case when tg_op in ('INSERT', 'UPDATE') and new.role = 'coach' then new.team_id end;
begin
  if old_team is not distinct from new_team then return coalesce(new, old); end if;
  if old_team is not null and not exists (select 1 from public.profiles p where p.role = 'coach' and p.team_id = old_team and p.user_id <> old.user_id)
    then perform public.start_tenure(old_team, false); end if;   -- he left: the team's bot coach is back
  if new_team is not null then perform public.start_tenure(new_team, true); end if;   -- a new coach takes over
  return coalesce(new, old);
end $$;
revoke execute on function public.profile_tenure() from public, anon, authenticated;
drop trigger if exists profile_tenure on public.profiles;
create trigger profile_tenure after insert or update of team_id, role or delete on public.profiles for each row execute function public.profile_tenure();

-- Today's coaches are long-standing: human-coached teams and bot teams alike start from Season 1, so nobody gets a new-coach bump now.
insert into public.coach_tenures (team_id, human, season, week)
select t.id, exists (select 1 from public.profiles p where p.role = 'coach' and p.team_id = t.id), 1, 0 from public.teams t
where not exists (select 1 from public.coach_tenures c where c.team_id = t.id);

-- A coach joining now saves the team's bot coach first, so he can come back later.
create or replace function public.invite_complete(p_id bigint, p_user uuid) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare inv public.coach_invites;
begin
  update public.coach_invites set used_at = now(), used_by = p_user where id = p_id and used_at is null returning * into inv;
  if inv.id is null then raise exception 'That passcode was already used'; end if;
  if exists (select 1 from public.coaches where team_id = inv.team_id) then
    if public.is_bot_team(inv.team_id) then
      insert into public.bot_coaches (team_id, coach) select c.team_id, to_jsonb(c) from public.coaches c where c.team_id = inv.team_id
      on conflict (team_id) do update set coach = excluded.coach, saved_at = now();
    end if;
    update public.coaches set name = inv.coach_name, potential = 5, ratings = public.make_coach_ratings(inv.team_id, 3),
      brain = public.make_bot_brain(inv.team_id, 'steady'), plan = null, updated_at = now() where team_id = inv.team_id;
  else
    perform public.ensure_coaches();
  end if;
  perform public.notify(null, false, true, 'coach_joined', format('Coach %s joined the %s', inv.coach_name, (select name from public.teams where id = inv.team_id)),
    'Welcome to the MFL!', jsonb_build_object('team', inv.team_id));
end $$;
revoke execute on function public.invite_complete(bigint, uuid) from public, anon, authenticated;
grant execute on function public.invite_complete(bigint, uuid) to service_role;
