-- 059: Specialty games and smarter drafting.
-- Specialty games: during the preseason a coach picks 2 regular-season HOME games to wear an alternate. Playoff home games: unlimited.
-- A light alternate at home flips the visitors into their dark Home jersey for that game. Bots pick theirs at Training camp.
-- Draft: bots plan ahead. A position whose starter is 26-27 (retiring within a year or two) with no young successor counts as a need now.

create table if not exists public.game_uniforms (
  game_id bigint not null references public.games(id) on delete cascade,
  team_id text not null references public.teams(id), slot smallint not null check (slot in (3, 4)),
  picked_at timestamptz not null default now(), primary key (game_id, team_id));
alter table public.game_uniforms enable row level security;
drop policy if exists "anyone reads game uniforms" on public.game_uniforms;
create policy "anyone reads game uniforms" on public.game_uniforms for select using (true);

-- p_slot 3 or 4 picks that alternate for the game; null takes the pick back.
create or replace function public.pick_specialty_game(p_game bigint, p_slot int) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); g public.games; used int;
begin
  if me is null then raise exception 'Only a team''s coach can pick specialty games'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null or g.home_team is distinct from me then raise exception 'Specialty uniforms are for your home games'; end if;
  if g.status = 'final' then raise exception 'That game was already played'; end if;
  if g.kind = 'preseason' then raise exception 'Specialty games are regular season and playoff home games'; end if;
  if g.kind = 'regular' and ((select value #>> '{}' from public.league_settings where key = 'phase') <> 'offseason' or g.season <> public.setting_int('current_season')) then
    raise exception 'Regular season specialty games are picked during the preseason'; end if;
  if p_slot is null then delete from public.game_uniforms where game_id = p_game and team_id = me; return jsonb_build_object('ok', true); end if;
  if p_slot not in (3, 4) then raise exception 'Pick one of your two alternate jerseys'; end if;
  if g.kind = 'regular' then
    select count(*) into used from public.game_uniforms u join public.games x on x.id = u.game_id
      where u.team_id = me and x.season = g.season and x.kind = 'regular' and u.game_id <> p_game;
    if used >= 2 then raise exception 'You already picked your 2 specialty games. Take one back first.'; end if;
  end if;
  insert into public.game_uniforms (game_id, team_id, slot) values (p_game, me, p_slot)
  on conflict (game_id, team_id) do update set slot = excluded.slot, picked_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- Bots (and reserved seats) pick 2 home games: rivalries first, then prime time, in their darkest alternate.
create or replace function public.bot_pick_specialty() returns int
language plpgsql security definer set search_path to '' as $$
declare t record; cs int := public.setting_int('current_season'); slot int; n int := 0;
begin
  for t in select id from public.teams where not exists (select 1 from public.profiles pr where pr.team_id = teams.id) loop
    continue when (select count(*) from public.game_uniforms u join public.games x on x.id = u.game_id where u.team_id = t.id and x.season = cs and x.kind = 'regular') >= 2;
    select j.slot into slot from public.team_jerseys j where j.team_id = t.id and j.slot in (3, 4)
      order by 0.299 * ('x' || substr(j.colors->>'jersey', 2, 2))::bit(8)::int + 0.587 * ('x' || substr(j.colors->>'jersey', 4, 2))::bit(8)::int
        + 0.114 * ('x' || substr(j.colors->>'jersey', 6, 2))::bit(8)::int asc limit 1;  -- darkest alternate
    insert into public.game_uniforms (game_id, team_id, slot)
    select g.id, t.id, coalesce(slot, 3) from public.games g
    where g.season = cs and g.kind = 'regular' and g.home_team = t.id and g.status <> 'final'
      and not exists (select 1 from public.game_uniforms u where u.game_id = g.id and u.team_id = t.id)
    order by public.is_rivalry(g.home_team, g.away_team) desc, (g.prime like '%night') desc nulls last, random()
    limit 2 - (select count(*) from public.game_uniforms u join public.games x on x.id = u.game_id where u.team_id = t.id and x.season = cs and x.kind = 'regular');
    n := n + 1;
  end loop;
  return n;
end $$;

-- How much a team needs a position for NEXT year: starters who are 27 (retiring at the next birthday) or 26 (a year later),
-- unless a young backup with real potential is already waiting. 1.0 = nothing to worry about, up to 1.3.
create or replace function public.bot_future_fit(p_team text, p_pos text) returns numeric
language sql stable security definer set search_path to '' as $$
  with st as (select p.age from public.players p where p.team_id = p_team and p.status = 'active' and p.position = p_pos and p.depth = 'starter'),
  heir as (select count(*) n from public.players p left join public.player_potential pp on pp.player_id = p.id
           where p.team_id = p_team and p.status = 'active' and p.position = p_pos and p.depth is distinct from 'starter'
             and p.age <= 24 and coalesce(pp.potential, p.stars) >= 3.5)
  select round(least(1.3, 1 + greatest(0, coalesce((select sum(case when age >= 27 then 1 when age = 26 then 0.5 else 0 end) from st), 0) - (select n from heir)) * 0.15), 3)
$$;

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.draft_bot_choice(text, integer)'::regprocedure);
  d := replace(d, '* public.bot_fit(p_team, pr.position) + random() * noise desc',
    '* least(1.35, public.bot_fit(p_team, pr.position) * public.bot_future_fit(p_team, pr.position)) + random() * noise desc');
  if d not like '%bot_future_fit%' then raise exception 'draft patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.bot_situation(text)'::regprocedure);
  d := replace(d, 'firsts int; total_picks int; needs jsonb;', 'firsts int; total_picks int; needs jsonb; future jsonb;');
  d := replace(d, $x$  score := (8.5 - rk) / 7.5$x$, $x$  select coalesce(jsonb_agg(position order by f desc), '[]') into future from (
    select position, public.bot_future_fit(p_team, position) f from public.roster_template order by 2 desc limit 3) x where f > 1.05;
  score := (8.5 - rk) / 7.5$x$);
  d := replace(d, $x$'needs', needs, 'brain', br$x$, $x$'needs', needs, 'future_needs', future, 'brain', br$x$);
  if d not like '%future_needs%' then raise exception 'situation patch failed'; end if;
  execute d;

  d := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
  d := replace(d, $x$  elsif step = 4 then
    update public.league_settings set value = '"regular_season"' where key = 'phase';$x$, $x$  elsif step = 4 then
    perform public.bot_pick_specialty();
    update public.league_settings set value = '"regular_season"' where key = 'phase';$x$);
  if d not like '%bot_pick_specialty%' then raise exception 'camp patch failed'; end if;
  execute d;
end $do$;

revoke all on function public.bot_pick_specialty() from public, anon, authenticated;
grant execute on function public.pick_specialty_game(bigint, int) to authenticated;
