-- The live draft room: the pick clock, bot picks, coach picks the commissioner approves, rookie deals, undrafted players to free agency.

alter table public.players add column if not exists draft_round int, add column if not exists draft_pick int, add column if not exists drafted_by text;

create table if not exists public.draft_room (
  season int primary key,
  status text not null default 'live' check (status in ('live', 'paused', 'done')),
  pick_no int not null default 1,          -- the pick on the clock (1 = first pick of the draft)
  clock_starts_at timestamptz,             -- the clock runs once the last pick's reveal is over
  clock_ends_at timestamptz,               -- bots pick at this moment; coaches get auto-picked at this moment
  paused_left int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.draft_selections (
  id bigint generated always as identity primary key,
  season int not null, pick_no int not null, round int not null, slot int not null,
  team_id text not null references public.teams(id), original_team_id text not null,
  player_id text not null references public.players(id),
  status text not null check (status in ('pending', 'approved', 'denied')),
  how text not null check (how in ('coach', 'bot', 'auto')),
  years int, per_year int,
  created_at timestamptz not null default now(), decided_at timestamptz
);
create unique index if not exists draft_selections_one_per_pick on public.draft_selections (season, pick_no) where status <> 'denied';
create unique index if not exists draft_selections_one_per_player on public.draft_selections (player_id) where status <> 'denied';

alter table public.draft_room enable row level security;
alter table public.draft_selections enable row level security;
create policy draft_room_read on public.draft_room for select using (true);
create policy draft_selections_read on public.draft_selections for select using (true);

insert into public.league_settings (key, value) values
  ('draft_pick_seconds', '180'), ('draft_bot_min_seconds', '6'), ('draft_bot_max_seconds', '25'),
  ('draft_reveal_seconds', '8'), ('draft_auto_approve_seconds', '120')
on conflict (key) do nothing;

-- Every pick in order: the round, the slot, whose pick it was and who owns it now.
create or replace function public.draft_slots(p_season int)
returns table (pick_no int, round int, slot int, original_team_id text, team_id text)
language sql stable security definer set search_path = '' as $$
  select (row_number() over (order by r.round, o.slot))::int, r.round, o.slot, o.team_id, k.owner_id
  from public.draft_order o
  cross join (select generate_series(1, 3) as round) r
  join public.teams t on t.id = o.team_id
  join public.picks k on k.season = o.season and k.round = r.round and upper(k.original_code) = upper(t.code)
  where o.season = p_season
$$;

-- Rookie deals by draft spot: first-rounders get more, everyone is cheap.
create or replace function public.rookie_deal(p_round int, p_slot int) returns jsonb language sql immutable set search_path = '' as $$
  select case p_round
    when 1 then jsonb_build_object('years', 3, 'per_year', (round((60000 - (p_slot - 1) * 1300) / 5000.0) * 5000)::int)
    when 2 then jsonb_build_object('years', 3, 'per_year', 35000)
    else jsonb_build_object('years', 2, 'per_year', 25000) end
$$;

-- Who a bot takes: talent and potential (rebuilders lean on potential), plus what the roster needs, plus a little gut feeling.
create or replace function public.draft_bot_choice(p_team text, p_season int) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare style text := (select gm_style from public.teams where id = p_team);
  w numeric := case style when 'rebuilding' then 1.0 when 'contender' then 0.45 else 0.7 end;
  pick text;
begin
  select pr.id into pick
  from public.players pr
  join public.roster_template rt on rt.position = pr.position
  left join public.player_potential pp on pp.player_id = pr.id
  left join lateral (select count(*) as have, (array_agg(x.stars order by x.stars desc))[rt.starters] as weakest
                     from public.players x where x.team_id = p_team and x.status = 'active' and x.position = pr.position) h on true
  where pr.status = 'prospect' and pr.draft_season = p_season
    and not exists (select 1 from public.draft_selections s where s.player_id = pr.id and s.status <> 'denied')
  order by pr.stars + coalesce(pp.potential, pr.stars + 2) * w
    + case when h.have < rt.starters then 1.2 when h.have < rt.starters + rt.backups then 0.5
           when h.have > rt.starters + rt.backups then -0.4 else 0 end
    + case when h.weakest is null or pr.stars > h.weakest then 0.4 else 0 end
    + random() * 0.6 desc
  limit 1;
  return pick;
end $$;

-- Starts the clock for the pick on the board (after the last pick's reveal plays).
create or replace function public.draft_set_clock(p_season int, p_delay int) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; owner text; secs int;
begin
  select * into r from public.draft_room where season = p_season;
  select team_id into owner from public.draft_slots(p_season) where pick_no = r.pick_no;
  secs := case when public.is_bot_team(owner)
    then public.setting_int('draft_bot_min_seconds') + floor(random() * (public.setting_int('draft_bot_max_seconds') - public.setting_int('draft_bot_min_seconds') + 1))::int
    else public.setting_int('draft_pick_seconds') end;
  update public.draft_room set clock_starts_at = now() + make_interval(secs => p_delay),
    clock_ends_at = now() + make_interval(secs => p_delay + secs), paused_left = null where season = p_season;
end $$;

-- Makes a pick official: rookie deal, joins the team, goes on the depth chart.
create or replace function public.draft_finalize(p_sel bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections; deal jsonb; yrs int; pay int; nm text;
begin
  select * into s from public.draft_selections where id = p_sel;
  deal := public.rookie_deal(s.round, s.slot); yrs := (deal->>'years')::int; pay := (deal->>'per_year')::int;
  update public.draft_selections set status = 'approved', decided_at = now(), years = yrs, per_year = pay where id = p_sel;
  insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source, role)
  values (s.player_id, s.team_id, s.season, s.season + yrs - 1, pay, pay * yrs, 'draft', 'backup');
  update public.players set rookie_season = s.season, draft_round = s.round, draft_pick = s.pick_no, drafted_by = s.team_id where id = s.player_id;
  perform public.join_team(s.player_id, s.team_id);
  select name into nm from public.players where id = s.player_id;
  perform public.log_event('drafted', s.player_id, s.team_id, format('Pick %s (Round %s): %s took %s', s.pick_no, s.round,
    (select name from public.teams where id = s.team_id), nm), jsonb_build_object('pick', s.pick_no, 'round', s.round, 'how', s.how));
end $$;

-- Moves to the next pick, or wraps up: anyone not drafted becomes a free agent.
create or replace function public.draft_next(p_season int) returns void
language plpgsql security definer set search_path = '' as $$
declare total int := (select count(*) from public.draft_slots(p_season)); n int;
begin
  update public.draft_room set pick_no = pick_no + 1 where season = p_season;
  if (select pick_no from public.draft_room where season = p_season) > total then
    update public.draft_room set status = 'done', finished_at = now(), clock_starts_at = null, clock_ends_at = null where season = p_season;
    update public.players set status = 'free_agent', left_season = p_season where status = 'prospect' and draft_season = p_season;
    get diagnostics n = row_count;
    perform public.log_event('draft_done', null, null, format('The Season %s draft is over. %s undrafted players became free agents', p_season, n),
      jsonb_build_object('undrafted', n));
  else
    perform public.draft_set_clock(p_season, public.setting_int('draft_reveal_seconds'));
  end if;
end $$;

-- Picks for whoever is on the clock (bots, or a coach whose time ran out) and moves on.
create or replace function public.draft_auto_pick(p_season int, p_how text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare r public.draft_room; sl record; who text; sid bigint;
begin
  select * into r from public.draft_room where season = p_season;
  select * into sl from public.draft_slots(p_season) where pick_no = r.pick_no;
  who := public.draft_bot_choice(sl.team_id, p_season);
  if who is null then perform public.draft_next(p_season); return null; end if;
  insert into public.draft_selections (season, pick_no, round, slot, team_id, original_team_id, player_id, status, how)
  values (p_season, r.pick_no, sl.round, sl.slot, sl.team_id, sl.original_team_id, who, 'pending', p_how) returning id into sid;
  perform public.draft_finalize(sid);
  perform public.draft_next(p_season);
  return sid;
end $$;
