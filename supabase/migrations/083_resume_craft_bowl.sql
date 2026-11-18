-- Paused games (resume where you left off), the Craft Bowl (logo, colors, stadium, 6 seasons ahead), and future draft picks.

-- 1) Pause and resume. The full engine run is kept (commissioner-only) so a resumed game is the exact same game even if a
--    roster changed while it was paused. game_state keeps the play it's on plus the score and clock for the game page.
alter table public.game_state add column if not exists play_index int not null default 0;
create table if not exists public.game_replays (
  game_id bigint primary key references public.games(id) on delete cascade,
  seed bigint not null, result jsonb not null, created_at timestamptz not null default now()
);
alter table public.game_replays enable row level security;
drop policy if exists game_replays_read on public.game_replays;
create policy game_replays_read on public.game_replays for select using (public.is_commissioner());

create or replace function public.game_save_replay(p_game bigint, p_seed bigint, p_result jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare st public.game_state;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into st from public.game_state where game_id = p_game;
  if st.seed is null or st.seed <> p_seed then raise exception 'This game was not started with that kickoff.'; end if;
  insert into public.game_replays (game_id, seed, result) values (p_game, p_seed, p_result) on conflict (game_id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.game_progress(p_game bigint, p_play int, p_home int, p_away int, p_quarter int, p_clock int)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.game_state set play_index = greatest(0, p_play), home_score = p_home, away_score = p_away,
    quarter = least(5, greatest(1, p_quarter)), clock_left = greatest(0, p_clock), clock_running = false, updated_at = now()
  where game_id = p_game and status = 'live';
end $$;

create or replace function public.game_reset(p_game bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select status from public.games where id = p_game) = 'final' then raise exception 'That game is final.'; end if;
  delete from public.game_replays where game_id = p_game;
  delete from public.game_state where game_id = p_game;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.game_unfinalize(p_game bigint)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.games;
begin
  if not public.is_commissioner() or not public.test_mode() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null then raise exception 'No such game'; end if;
  delete from public.player_game_stats where game_id = p_game;
  delete from public.game_results where game_id = p_game;
  delete from public.game_replays where game_id = p_game;
  delete from public.game_state where game_id = p_game;
  update public.games set status = 'scheduled', home_score = null, away_score = null, played_at = null where id = p_game;
  perform public.refresh_team_records(g.season);
  return jsonb_build_object('ok', true);
end $$;

-- 2) The Craft Bowl plan: one row per season (craft_bowls is the champions history; this is logo, colors and stadium). Its stadium (a team's home field) can't host again within 3 seasons either way.
create table if not exists public.craft_bowl_plans (
  season int primary key, logo_url text, primary_color text not null default '#19c26b', secondary_color text not null default '#0a3d2c',
  stadium_team text references public.teams(id) on update cascade, updated_at timestamptz not null default now()
);
alter table public.craft_bowl_plans enable row level security;
drop policy if exists craft_bowl_plans_read on public.craft_bowl_plans;
create policy craft_bowl_plans_read on public.craft_bowl_plans for select using (true);

create or replace function public.craft_bowl_open_stadiums(p_season int)
returns setof text language sql stable security definer set search_path to '' as $$
  select t.id from public.teams t
  where not exists (select 1 from public.craft_bowl_plans c where c.stadium_team = t.id and c.season <> p_season and abs(c.season - p_season) <= 3)
$$;

-- Makes sure the current season and the next 6 each have a Craft Bowl with a stadium (random, following the 3-season rule).
create or replace function public.craft_bowl_fill()
returns void language plpgsql security definer set search_path to '' as $$
declare cur int := coalesce(public.setting_int('current_season'), 1); s int; pick text;
begin
  for s in cur .. cur + 6 loop
    insert into public.craft_bowl_plans (season) values (s) on conflict do nothing;
    if (select stadium_team from public.craft_bowl_plans where season = s) is null then
      select id into pick from public.craft_bowl_open_stadiums(s) id order by random() limit 1;
      update public.craft_bowl_plans set stadium_team = pick where season = s;
    end if;
  end loop;
end $$;
revoke execute on function public.craft_bowl_fill() from public, anon, authenticated;

create or replace function public.craft_bowl_list()
returns setof public.craft_bowl_plans language plpgsql security definer set search_path to '' as $$
begin
  if public.is_commissioner() then perform public.craft_bowl_fill(); end if;
  return query select * from public.craft_bowl_plans order by season;
end $$;

create or replace function public.craft_bowl_save(p_season int, p_logo text, p_primary text, p_secondary text, p_stadium text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare cur int := coalesce(public.setting_int('current_season'), 1);
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_season < cur or p_season > cur + 6 then raise exception 'You can only set this season and the next 6.'; end if;
  if p_primary !~ '^#[0-9a-fA-F]{6}$' or p_secondary !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Colors must look like #1a2b3c.'; end if;
  if p_stadium is not null and p_stadium not in (select public.craft_bowl_open_stadiums(p_season)) then
    raise exception 'That stadium hosts a Craft Bowl within 3 seasons of this one.'; end if;
  insert into public.craft_bowl_plans (season, logo_url, primary_color, secondary_color, stadium_team, updated_at)
  values (p_season, nullif(p_logo, ''), lower(p_primary), lower(p_secondary), p_stadium, now())
  on conflict (season) do update set logo_url = excluded.logo_url, primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color, stadium_team = excluded.stadium_team, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- The dice: a random stadium that follows the 3-season rule (and isn't the one it already has, when there's a choice).
create or replace function public.craft_bowl_randomize(p_season int)
returns text language plpgsql security definer set search_path to '' as $$
declare cur int := coalesce(public.setting_int('current_season'), 1); was text; pick text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_season < cur or p_season > cur + 6 then raise exception 'You can only set this season and the next 6.'; end if;
  insert into public.craft_bowl_plans (season) values (p_season) on conflict do nothing;
  select stadium_team into was from public.craft_bowl_plans where season = p_season;
  select id into pick from public.craft_bowl_open_stadiums(p_season) id order by (id is not distinct from was), random() limit 1;
  update public.craft_bowl_plans set stadium_team = pick, updated_at = now() where season = p_season;
  return pick;
end $$;
revoke execute on function public.craft_bowl_save(int, text, text, text, text) from public, anon;
revoke execute on function public.craft_bowl_randomize(int) from public, anon;
revoke execute on function public.craft_bowl_list() from public, anon;
grant execute on function public.craft_bowl_save(int, text, text, text, text) to authenticated;
grant execute on function public.craft_bowl_randomize(int) to authenticated;
grant execute on function public.craft_bowl_list() to authenticated, anon;

-- Season 8: Craft Bowl VIII, green, at a green team's stadium (Dark Forest Zombies, The Crypt).
insert into public.craft_bowl_plans (season, logo_url, primary_color, secondary_color, stadium_team)
values (8, 'craft-bowl/Craft Bowl VIII Logo.png', '#19e27a', '#0a4f3a', 'drf')
on conflict (season) do update set logo_url = excluded.logo_url, primary_color = excluded.primary_color, secondary_color = excluded.secondary_color, stadium_team = excluded.stadium_team;
select public.craft_bowl_fill();

-- 3) Draft picks: every team always owns a 1st, 2nd and 3rd for the next draft and the 3 after it. Spent picks stay in the
--    table (old trades point at them) but the site only shows picks from the next draft on.
create or replace function public.ensure_future_picks()
returns void language plpgsql security definer set search_path to '' as $$
declare nd int := public.next_draft_season();
begin
  insert into public.picks (owner_id, original_code, season, round)
  select t.id, upper(t.code), s, r
  from public.teams t cross join generate_series(nd, nd + 3) s cross join generate_series(1, 3) r
  where not exists (select 1 from public.picks k where k.season = s and k.round = r and upper(k.original_code) = upper(t.code));
end $$;
revoke execute on function public.ensure_future_picks() from public, anon, authenticated;

create or replace function public.draft_done_picks()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.finished_at is not null and old.finished_at is null then perform public.ensure_future_picks(); end if;
  return new;
end $$;
drop trigger if exists draft_done_picks on public.draft_room;
create trigger draft_done_picks after update of finished_at on public.draft_room for each row execute function public.draft_done_picks();
select public.ensure_future_picks();
