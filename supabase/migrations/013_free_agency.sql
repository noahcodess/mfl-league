-- Free agency: roster template, depth chart and jersey number placement, street free agents (so the league can run
-- forever), offers, decision rounds, bot bidding, and players who refuse to re-sign because they want to test the market.

-- Roster template: what a full roster looks like (from the league's real rosters). 20 starters + 20 backups.
create table public.roster_template (position text primary key, starters int not null, backups int not null);
insert into public.roster_template values
  ('QB', 1, 1), ('RB', 1, 1), ('WR', 2, 2), ('TE', 1, 1), ('OT', 2, 2), ('OG', 2, 2), ('C', 1, 1),
  ('DL', 1, 1), ('DT', 2, 2), ('DE', 2, 2), ('LB', 2, 2), ('CB', 2, 2), ('SS', 1, 1);
alter table public.roster_template enable row level security;
create policy "anyone reads the roster template" on public.roster_template for select to anon, authenticated using (true);

alter table public.players add column previous_team_id text references public.teams(id) on update cascade;
alter table public.contracts add column role text check (role in ('starter', 'backup'));
insert into public.league_settings (key, value) values ('fa_round', '0'), ('fa_rounds', '4'), ('max_roster', '45'), ('max_open_offers', '6')
  on conflict (key) do nothing;

-- Some players won't re-sign at all: stars who care about money and feel no loyalty, or anyone who's angry.
create or replace function public.wants_to_test_market(p public.players) returns boolean
language sql stable security definer set search_path = '' as $$
  select p.mood = 'angry' or exists (select 1 from public.player_traits t where t.player_id = p.id
    and t.loyalty < 0.25 and t.money > 0.45 and p.stars >= 4)
$$;

-- Picks a free jersey number for a position on a team (NFL ranges), at random.
create or replace function public.assign_number(p_team text, p_position text) returns int
language plpgsql security definer set search_path = '' as $$
declare ranges int[][]; lo int; hi int; n int; i int;
begin
  ranges := case p_position
    when 'QB' then array[[1, 19]] when 'RB' then array[[0, 9], [20, 49]] when 'WR' then array[[0, 19], [80, 89]]
    when 'TE' then array[[80, 89], [40, 49]] when 'C' then array[[50, 79]] when 'OG' then array[[60, 79], [50, 59]]
    when 'OT' then array[[60, 79], [50, 59]] when 'DL' then array[[90, 99], [50, 79]] when 'DT' then array[[90, 99], [50, 79]]
    when 'DE' then array[[90, 99], [40, 59]] when 'LB' then array[[0, 9], [40, 59]] when 'CB' then array[[0, 9], [20, 39]]
    when 'SS' then array[[0, 9], [20, 49]] else array[[0, 99]] end;
  for i in 1 .. array_length(ranges, 1) loop
    lo := ranges[i][1]; hi := ranges[i][2];
    select g into n from generate_series(lo, hi) g
      where not exists (select 1 from public.players x where x.team_id = p_team and x.number = g) order by random() limit 1;
    if n is not null then return n; end if;
  end loop;
  select g into n from generate_series(0, 99) g where not exists (select 1 from public.players x where x.team_id = p_team and x.number = g) order by random() limit 1;
  return n;
end $$;

-- Re-sorts one position group on a team: promised starters first, then the best players, filling the template's
-- starter spots; everyone else is a backup. Slots are numbered 1, 2, 3...
create or replace function public.place_depth(p_team text, p_position text) returns void
language plpgsql security definer set search_path = '' as $$
declare n_start int; r record; i int := 0;
begin
  select starters into n_start from public.roster_template where position = p_position;
  for r in select p.id from public.players p
           left join public.contracts c on c.player_id = p.id and c.status = 'active'
           where p.team_id = p_team and p.position = p_position and p.status = 'active'
           order by (c.role = 'starter') desc nulls last, p.stars desc nulls last, p.age asc nulls last loop
    i := i + 1;
    update public.players set depth = case when i <= coalesce(n_start, 1) then 'starter' else 'backup' end,
      slot = case when i <= coalesce(n_start, 1) then i else i - coalesce(n_start, 1) end where id = r.id;
  end loop;
end $$;

-- Puts a signed player on a team: roster spot, jersey number, depth chart.
create or replace function public.join_team(p_player text, p_team text) returns void
language plpgsql security definer set search_path = '' as $$
declare pos text;
begin
  select position into pos from public.players where id = p_player;
  update public.players set team_id = p_team, status = 'active', number = public.assign_number(p_team, pos) where id = p_player;
  perform public.place_depth(p_team, pos);
end $$;
