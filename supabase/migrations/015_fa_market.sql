-- Free agency market: coaches and bot GMs make offers, then each round every free agent picks the best offer he'll
-- accept. Players get less picky each round (desperation), stars may hold out in round 1, and old teams get a loyalty edge.

alter table public.negotiations drop constraint negotiations_status_check;
alter table public.negotiations add constraint negotiations_status_check check (status in ('open', 'agreed', 'walked', 'approved', 'denied', 'expired'));

-- 1-star players were falling into the default price; give them their own.
create or replace function public.market_value(p public.players) returns int language sql stable set search_path = '' as $$
  select public.round5k(
    (case p.stars when 0.5 then 20000 when 1 then 30000 when 1.5 then 40000 when 2 then 50000 when 2.5 then 65000 when 3 then 85000
                  when 3.5 then 100000 when 4 then 125000 when 4.5 then 160000 when 5 then 210000 else 50000 end)
    * (case when p.elite then 1.15 else 1 end)
    * (case p.position when 'QB' then 1.25 when 'WR' then 1.1 when 'DE' then 1.1 when 'OT' then 1.1
                       when 'TE' then 0.9 when 'OG' then 0.9 when 'C' then 0.9 when 'DT' then 0.9 when 'SS' then 0.9 else 1 end)
    * (case p.age when 21 then 0.9 when 22 then 0.9 when 26 then 0.95 when 27 then 0.85 else 1 end)
    * (case when p.depth = 'backup' then 0.85 else 1 end))
$$;

-- Loyalty now also counts for a free agent's old team.
create or replace function public.required_price(p public.players, p_team text, p_years int, p_role text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare t public.player_traits; team_stars numeric; pt numeric; lg numeric; non_money numeric; flex numeric; discount numeric;
begin
  select * into t from public.player_traits where player_id = p.id;
  select overall_stars into team_stars from public.teams where id = p_team;
  pt := case when p_role = 'starter' then 1 when p.stars >= 4 then 0.2 when p.stars >= 3 then 0.5 else 0.8 end;
  lg := least(1, coalesce(team_stars, 3) / 5.0); -- stand-in until coach legacy ratings exist
  non_money := (t.playing_time * pt + t.legacy * lg) / nullif(t.playing_time + t.legacy, 0);
  flex := case when p.stars >= 4.5 then 0.5 when p.stars <= 2.5 then 1.3 else 1 end;
  discount := (1 - t.money) * (coalesce(non_money, 0.5) - 0.5) * 0.4 * flex
            + (case when coalesce(p.team_id, p.previous_team_id) = p_team then t.loyalty * 0.08 else 0 end);
  return public.round5k(public.ask_price(p) * (1 - discount + abs(p_years - public.preferred_years(p)) * 0.04));
end $$;

create table public.fa_offers (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  team_id text not null references public.teams(id) on update cascade,
  season int not null,
  round int not null,
  years int not null check (years between 1 and 3),
  per_year int not null check (per_year >= 10000),
  role text not null check (role in ('starter', 'backup')),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'withdrawn', 'expired')),
  created_at timestamptz not null default now()
);
create unique index fa_offers_one_open on public.fa_offers(player_id, team_id) where status = 'open';
alter table public.fa_offers enable row level security;
create policy "own team, commissioner or site owner reads offers" on public.fa_offers for select to authenticated using (
  team_id = public.my_team_id() or public.is_commissioner() or public.is_site_owner()
);

create or replace function public.is_bot_team(p_team text) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles pr where pr.team_id = p_team and pr.role = 'coach')
$$;

-- Players on the roster plus signings waiting for approval.
create or replace function public.team_roster_count(p_team text) returns int language sql stable security definer set search_path = '' as $$
  select ((select count(*) from public.players where team_id = p_team and status = 'active')
        + (select count(*) from public.negotiations where team_id = p_team and status = 'agreed' and kind = 'free_agency'))::int
$$;

-- How picky free agents are this round: 100% in round 1, 7% less each round after, never below 70%.
create or replace function public.fa_desperation(p_round int) returns numeric language sql immutable set search_path = '' as $$
  select greatest(0.7, 1 - 0.07 * (greatest(p_round, 1) - 1))
$$;

create or replace function public.fa_open() returns boolean language sql stable security definer set search_path = '' as $$
  select (select value #>> '{}' from public.league_settings where key = 'phase') = 'offseason' and public.setting_int('offseason_step') = 4
$$;

-- What the free agent thinks of an offer before the next round: strong / close / low. Never the exact number.
create or replace function public.fa_offer_read(p public.players, p_team text, p_years int, p_per_year int, p_role text) returns text
language sql stable security definer set search_path = '' as $$
  select case when r >= 1 then 'strong' when r >= 0.85 then 'close' else 'low' end
  from (select p_per_year::numeric / nullif(public.required_price(p, p_team, p_years, p_role)
               * public.fa_desperation(public.setting_int('fa_round') + 1), 0) as r) x
$$;

-- A coach makes (or replaces) an offer to a free agent.
create or replace function public.make_fa_offer(p_player text, p_years int, p_per_year int, p_role text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.players; my_team text := public.my_team_id(); cap int := public.setting_int('cap_limit');
begin
  if my_team is null then raise exception 'Only a team''s coach can make offers'; end if;
  if not public.fa_open() then raise exception 'Free agency isn''t open right now'; end if;
  select * into p from public.players where id = p_player;
  if p.id is null or p.status <> 'free_agent' then raise exception 'He isn''t a free agent'; end if;
  if exists (select 1 from public.negotiations where player_id = p.id and status = 'agreed') then raise exception 'He already agreed to a deal'; end if;
  if p_years not between 1 and 3 then raise exception 'Deals are 1 to 3 years'; end if;
  if p_years > public.max_years(p) then raise exception 'He would pass the max age before that deal ends'; end if;
  if p_role not in ('starter', 'backup') then raise exception 'Pick a role'; end if;
  if p_per_year < 10000 then raise exception 'The minimum salary is $10K a year'; end if;
  if p_per_year * p_years > 1000000 then raise exception 'Contracts max out at $1M total'; end if;
  if public.team_cap_committed(my_team) + p_per_year > cap then raise exception 'Not enough cap room for that offer'; end if;
  if public.team_roster_count(my_team) >= public.setting_int('max_roster') then raise exception 'Your roster is full'; end if;
  if (select count(*) from public.fa_offers where team_id = my_team and status = 'open' and player_id <> p.id) >= public.setting_int('max_open_offers') then
    raise exception 'You can only have % offers out at once', public.setting_int('max_open_offers');
  end if;
  update public.fa_offers set status = 'withdrawn' where player_id = p.id and team_id = my_team and status = 'open';
  insert into public.fa_offers (player_id, team_id, season, round, years, per_year, role)
  values (p.id, my_team, public.setting_int('current_season'), public.setting_int('fa_round') + 1, p_years, p_per_year, p_role);
  return jsonb_build_object('read', public.fa_offer_read(p, my_team, p_years, p_per_year, p_role));
end $$;

create or replace function public.withdraw_fa_offer(p_player text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.fa_open() then raise exception 'Free agency isn''t open right now'; end if;
  update public.fa_offers set status = 'withdrawn' where player_id = p_player and team_id = public.my_team_id() and status = 'open';
end $$;

-- Quote for the offer screen. Any signed-in coach can see a free agent's asking price.
create or replace function public.fa_quote(p_player text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.players; my_team text := public.my_team_id(); o public.fa_offers;
begin
  select * into p from public.players where id = p_player;
  if p.id is null or p.status <> 'free_agent' then raise exception 'He isn''t a free agent'; end if;
  select * into o from public.fa_offers where player_id = p.id and team_id = my_team and status = 'open';
  return jsonb_build_object('ask', public.ask_price(p), 'years', public.preferred_years(p), 'max_years', public.max_years(p),
    'market', public.market_value(p), 'round', public.setting_int('fa_round'), 'rounds', public.setting_int('fa_rounds'),
    'cap_room', case when my_team is null then null else public.setting_int('cap_limit') - public.team_cap_committed(my_team) end,
    'offers_out', (select count(*) from public.fa_offers where team_id = my_team and status = 'open'),
    'interest', (select count(*) from public.fa_offers where player_id = p.id and status = 'open'),
    'mine', case when o.id is null then null else jsonb_build_object('years', o.years, 'per_year', o.per_year, 'role', o.role,
                 'read', public.fa_offer_read(p, my_team, o.years, o.per_year, o.role)) end);
end $$;

revoke execute on function public.is_bot_team(text), public.team_roster_count(text), public.fa_desperation(int), public.fa_open(),
  public.fa_offer_read(public.players, text, int, int, text), public.market_value(public.players), public.required_price(public.players, text, int, text)
  from public, anon, authenticated;
revoke execute on function public.make_fa_offer(text, int, int, text), public.withdraw_fa_offer(text), public.fa_quote(text) from public, anon;
grant execute on function public.make_fa_offer(text, int, int, text), public.withdraw_fa_offer(text), public.fa_quote(text) to authenticated;
