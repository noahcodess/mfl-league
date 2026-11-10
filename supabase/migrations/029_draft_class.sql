-- Draft classes and scouting.
-- Each offseason a class of prospects is generated (status 'prospect'): auto names with a matching country, a
-- college, last-season college stats and honors that hint at their talent. Positions are balanced, tilted toward
-- whatever the league is short on. Rookies arrive about 2 stars under their potential, never above 3.5 stars.
-- Scouting: 2 scouts per 1st-round pick and 1 per 2nd/3rd for prospects, and 5 a season for free agents. A scout
-- reveals that player's potential (and bar outlines) to your team only.

alter table public.players drop constraint players_status_check;
alter table public.players add constraint players_status_check check (status in ('active', 'free_agent', 'retired', 'prospect'));
alter table public.players add column college text, add column college_stats jsonb, add column draft_season int, add column rookie_season int;
insert into public.league_settings (key, value) values ('draft_class_size', '72'), ('fa_scouts', '5') on conflict (key) do nothing;

create or replace function public.college_profile(p public.players, pot numeric) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare q numeric := least(1, greatest(0, (pot - 1) / 4 + (random()::numeric - 0.5) * 0.25)); s jsonb; honors text[] := '{}';
  f numeric := 0.85 + random()::numeric * 0.3;
begin
  s := case
    when p.position = 'QB' then jsonb_build_array(
      jsonb_build_array('Pass yards', round((1800 + q * 2800) * f)), jsonb_build_array('Pass TD', round((10 + q * 30) * f)),
      jsonb_build_array('INT', round(14 - q * 9 + random()::numeric * 3)), jsonb_build_array('Comp %', round(55 + q * 14 + random()::numeric * 3, 1)))
    when p.position = 'RB' then jsonb_build_array(
      jsonb_build_array('Rush yards', round((600 + q * 1300) * f)), jsonb_build_array('Rush TD', round((5 + q * 15) * f)),
      jsonb_build_array('Yards/carry', round(4 + q * 2.5 + random()::numeric * 0.6, 1)), jsonb_build_array('Catches', round((10 + q * 25) * f)))
    when p.position = 'WR' then jsonb_build_array(
      jsonb_build_array('Catches', round((30 + q * 60) * f)), jsonb_build_array('Rec yards', round((400 + q * 1100) * f)),
      jsonb_build_array('Rec TD', round((3 + q * 12) * f)), jsonb_build_array('Long', round(35 + q * 45 + random()::numeric * 10)))
    when p.position = 'TE' then jsonb_build_array(
      jsonb_build_array('Catches', round((15 + q * 45) * f)), jsonb_build_array('Rec yards', round((200 + q * 600) * f)),
      jsonb_build_array('Rec TD', round((2 + q * 8) * f)), jsonb_build_array('Starts', 8 + floor(random()::numeric * 6)))
    when p.position in ('OT', 'OG', 'C') then jsonb_build_array(
      jsonb_build_array('Starts', 10 + floor(random()::numeric * 5)), jsonb_build_array('Sacks allowed', round(greatest(0, 6 - q * 5 + random()::numeric * 2))),
      jsonb_build_array('Pancakes', round((20 + q * 40) * f)), jsonb_build_array('Penalties', round(greatest(0, 7 - q * 5 + random()::numeric * 2))))
    when p.position in ('DL', 'DT') then jsonb_build_array(
      jsonb_build_array('Tackles', round((25 + q * 30) * f)), jsonb_build_array('Tackles for loss', round((4 + q * 10) * f)),
      jsonb_build_array('Sacks', round((2 + q * 8) * f, 1)), jsonb_build_array('QB hurries', round((5 + q * 15) * f)))
    when p.position = 'DE' then jsonb_build_array(
      jsonb_build_array('Tackles', round((30 + q * 30) * f)), jsonb_build_array('Tackles for loss', round((6 + q * 12) * f)),
      jsonb_build_array('Sacks', round((3 + q * 12) * f, 1)), jsonb_build_array('Forced fumbles', round(q * 4 * f)))
    when p.position = 'LB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((50 + q * 70) * f)), jsonb_build_array('Tackles for loss', round((4 + q * 10) * f)),
      jsonb_build_array('Sacks', round((1 + q * 6) * f, 1)), jsonb_build_array('INT', round(q * 3 * f)))
    when p.position = 'CB' then jsonb_build_array(
      jsonb_build_array('Tackles', round((25 + q * 30) * f)), jsonb_build_array('INT', round((1 + q * 6) * f)),
      jsonb_build_array('Pass breakups', round((4 + q * 12) * f)), jsonb_build_array('Pick-sixes', round(q * 2 * f)))
    else jsonb_build_array(
      jsonb_build_array('Tackles', round((40 + q * 50) * f)), jsonb_build_array('INT', round((1 + q * 5) * f)),
      jsonb_build_array('Pass breakups', round((3 + q * 8) * f)), jsonb_build_array('Forced fumbles', round(q * 3 * f))) end;
  if q > 0.85 and random()::numeric < 0.6 then honors := honors || 'All-American'::text; end if;
  if q > 0.9 and random()::numeric < 0.25 then honors := honors || 'Conference Player of the Year'::text; end if;
  if q > 0.65 and random()::numeric < 0.5 then honors := honors || 'All-Conference First Team'::text;
  elsif q > 0.45 and random()::numeric < 0.35 then honors := honors || 'All-Conference Second Team'::text; end if;
  if random()::numeric < 0.12 then honors := honors || 'Team Captain'::text; end if;
  if random()::numeric < 0.05 then honors := honors || 'Bowl Game MVP'::text; end if;
  return jsonb_build_object('class', case when p.age >= 22 then 'Senior' else 'Junior (early entry)' end,
    'games', 11 + floor(random()::numeric * 4), 'stats', s, 'honors', to_jsonb(honors));
end $$;

create or replace function public.generate_draft_class(p_season int, p_count int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  intl_now numeric := (select count(*) filter (where nationality <> 'USA')::numeric / greatest(count(*), 1) from public.players where status in ('active', 'free_agent'));
  intl_chance numeric := least(0.35, greatest(0.10, (0.18 - intl_now) * 3 + 0.10));
  countries text[] := '{Nigeria,Nigeria,Ghana,Jamaica,Samoa,Samoa,Tonga,Canada,Canada,England,Australia,Germany,Mexico,Mexico,Brazil,France}';
  colleges text[] := '{Alabama,Georgia,Ohio State,Michigan,LSU,Texas,Oklahoma,Clemson,Florida State,Miami,Oregon,USC,Penn State,Notre Dame,Tennessee,Auburn,Florida,Texas A&M,Wisconsin,Iowa,Utah,Washington,Ole Miss,Arkansas,Kentucky,Missouri,Baylor,TCU,Kansas State,North Carolina,NC State,Virginia Tech,Louisville,Pittsburgh,Boise State,Cincinnati,UCF,Oregon State,Stanford,Arizona State,Minnesota,Nebraska,Purdue,Houston,Memphis,Tulane,Appalachian State,North Dakota State,South Dakota State,Montana}';
  pos text; country text; nm text; age int; pot numeric; stars numeric; pid text; i int; tries int; made int := 0; pl public.players;
begin
  for i in 1 .. p_count loop
    -- Mostly balanced by a full roster's shape, tilted toward positions the league is thin at.
    select rt.position into pos from public.roster_template rt
      order by (rt.starters + rt.backups) * (1 + random() * 1.5)
        + greatest(0, 16 * (rt.starters + rt.backups) - (select count(*) from public.players x where x.position = rt.position and x.status in ('active', 'free_agent'))) * 0.15
        desc limit 1;
    country := case when random() < intl_chance then countries[1 + floor(random() * array_length(countries, 1))::int] else 'USA' end;
    tries := 0;
    loop
      nm := public.random_name(country);
      exit when not exists (select 1 from public.players where name = nm) or tries > 25;
      tries := tries + 1;
    end loop;
    age := (array[21, 21, 21, 21, 22, 22, 22, 22, 23, 23])[1 + floor(random() * 10)::int];
    pot := (array[2, 2, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5])[1 + floor(random() * 20)::int];
    if random() < 0.5 then pot := least(5, pot + (array[-0.5, 0, 0, 0.5])[1 + floor(random() * 4)::int]); end if;
    pot := greatest(2, pot);
    stars := least(3.5, pot, greatest(1, pot - 2 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int]));
    pid := format('dr%s-%s', p_season, substr(md5(random()::text), 1, 6));
    insert into public.players (id, team_id, name, position, stars, elite, age, mood, nationality, notes, status, college, draft_season)
    values (pid, null, nm, pos, stars, false, age, 'normal', country, '{}', 'prospect',
            colleges[1 + floor(random() * array_length(colleges, 1))::int], p_season);
    insert into public.player_potential (player_id, potential) values (pid, pot);
    select * into pl from public.players where id = pid;
    update public.players set college_stats = public.college_profile(pl, pot) where id = pid;
    made := made + 1;
  end loop;
  return made;
end $$;

-- Scouting.
create table public.scout_reports (
  id bigint generated always as identity primary key,
  team_id text not null references public.teams(id) on update cascade,
  player_id text not null references public.players(id) on delete cascade,
  season int not null,
  kind text not null check (kind in ('draft', 'fa')),
  created_at timestamptz not null default now(),
  unique (team_id, player_id)
);
alter table public.scout_reports enable row level security;
create policy "own team, commissioner or site owner reads scout reports" on public.scout_reports for select to authenticated using (
  team_id = public.my_team_id() or public.is_commissioner() or public.is_site_owner()
);

alter policy "own team, commissioner or site owner reads potential" on public.player_potential using (
  public.is_commissioner() or public.is_site_owner()
  or exists (select 1 from public.players p where p.id = player_potential.player_id and p.team_id = public.my_team_id())
  or exists (select 1 from public.scout_reports s where s.player_id = player_potential.player_id and s.team_id = public.my_team_id())
);

create or replace function public.scouts_left(p_team text, p_kind text) returns int language sql stable security definer set search_path = '' as $$
  select case when p_kind = 'draft' then
      (select coalesce(sum(case when round = 1 then 2 else 1 end), 0) from public.picks where owner_id = p_team and season = public.setting_int('current_season'))::int
    else coalesce(public.setting_int('fa_scouts'), 5) end
    - (select count(*) from public.scout_reports where team_id = p_team and kind = p_kind and season = public.setting_int('current_season'))::int
$$;

create or replace function public.my_scouts() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.my_team_id() is null then null else
    jsonb_build_object('draft', public.scouts_left(public.my_team_id(), 'draft'), 'fa', public.scouts_left(public.my_team_id(), 'fa'),
      'scouted', (select coalesce(jsonb_agg(player_id), '[]') from public.scout_reports where team_id = public.my_team_id())) end
$$;

create or replace function public.scout_player(p_player text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.players; my_team text := public.my_team_id(); kind text;
begin
  if my_team is null then raise exception 'Only a team''s coach can send scouts'; end if;
  select * into p from public.players where id = p_player;
  kind := case p.status when 'prospect' then 'draft' when 'free_agent' then 'fa' end;
  if kind is null then raise exception 'You can only scout draft prospects and free agents'; end if;
  if exists (select 1 from public.scout_reports where team_id = my_team and player_id = p.id) then raise exception 'You already scouted him'; end if;
  if public.scouts_left(my_team, kind) <= 0 then
    raise exception '%', case when kind = 'draft' then 'No draft scouts left (2 per 1st-round pick, 1 per 2nd or 3rd)' else 'No free agency scouts left this offseason' end;
  end if;
  insert into public.scout_reports (team_id, player_id, season, kind) values (my_team, p.id, public.setting_int('current_season'), kind);
  return jsonb_build_object('left', public.scouts_left(my_team, kind),
    'potential', (select potential from public.player_potential where player_id = p.id),
    'ceilings', (select ceilings from public.player_potential where player_id = p.id));
end $$;

-- New classes arrive at Birthday & Farewell (if this season's class isn't out yet).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  d := replace(d, 'update public.players set age = age + 1 where status <> ''retired''',
                  'update public.players set age = age + 1 where status in (''active'', ''free_agent'')'); -- prospects age once drafted
  execute replace(d, '  elsif step = 1 then',
    '    if not exists (select 1 from public.players where status = ''prospect'' and draft_season = season) then
      perform public.log_event(''draft_class'', null, null, format(''The Season %s draft class is out: %s prospects'', season,
        public.generate_draft_class(season, coalesce(public.setting_int(''draft_class_size''), 72))));
    end if;
  elsif step = 1 then');
end $$;

-- Prospects aren't in the league yet: keep them out of ranks.
create or replace view public.player_ranks with (security_invoker = true) as
select p.id as player_id, x.ovr,
  rank() over (partition by p.position order by x.ovr desc) as pos_rank,
  rank() over (order by x.ovr desc) as overall_rank
from public.players p
join public.player_attributes a on a.player_id = p.id
cross join lateral (
  select round(avg(e.value::numeric) filter (where e.key not in ('speed', 'toughness'))
    * (case when p.position in ('RB', 'WR', 'CB', 'SS') then 0.85 else 1 end)
    + (case when p.position in ('RB', 'WR', 'CB', 'SS') then (a.ratings->>'speed')::numeric * 0.15 else 0 end))::int as ovr
  from jsonb_each_text(a.ratings) e) x
where p.status in ('active', 'free_agent');

revoke execute on function public.college_profile(public.players, numeric), public.generate_draft_class(int, int), public.scouts_left(text, text)
  from public, anon, authenticated;
revoke execute on function public.my_scouts(), public.scout_player(text) from public, anon;
grant execute on function public.my_scouts(), public.scout_player(text) to authenticated;

-- This offseason's class (Season 8).
select public.generate_draft_class(8, 72);
