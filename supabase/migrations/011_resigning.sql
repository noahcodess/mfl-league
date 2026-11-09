-- Re-signing: player personalities, market value and asking price, negotiation rounds, the commissioner's approval,
-- and bot teams re-signing on their own. Every decision runs here on the server so it can't be gamed from the page.

-- Personalities ------------------------------------------------------------------------------------------------
create table public.player_traits (
  player_id text primary key references public.players(id) on delete cascade,
  money numeric(4,3) not null,        -- what he cares about; money + playing_time + legacy = 1
  playing_time numeric(4,3) not null,
  legacy numeric(4,3) not null,
  greed numeric(4,2) not null,        -- 0.85 team-friendly ... 1.25 wants every dollar
  loyalty numeric(4,3) not null,      -- 0..1, discount for staying with his own team
  patience int not null               -- bad offers he'll take before he walks
);

create or replace function public.make_traits(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare a numeric := 1 + floor(random() * 10); b numeric := 1 + floor(random() * 10); c numeric := 1 + floor(random() * 10); s numeric; g numeric;
begin
  s := a + b + c;
  g := round(0.85 + (a / s) * 0.55 + random()::numeric * 0.1, 2);
  insert into public.player_traits values (p_id, round(a / s, 3), round(b / s, 3), round(1 - round(a / s, 3) - round(b / s, 3), 3),
    g, round(random()::numeric, 3), 3 + floor(random() * 3)::int - (case when g > 1.1 then 1 else 0 end))
  on conflict (player_id) do nothing;
end $$;

-- New players (draft picks, generated free agents) get a personality automatically.
create or replace function public.players_make_traits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin perform public.make_traits(new.id); return new; end $$;
create trigger players_make_traits after insert on public.players for each row execute function public.players_make_traits();
select public.make_traits(id) from public.players;

alter table public.player_traits enable row level security;
create policy "own team, commissioner or site owner reads traits" on public.player_traits for select to authenticated using (
  public.is_commissioner() or public.is_site_owner()
  or exists (select 1 from public.players p where p.id = player_id and p.team_id = public.my_team_id())
);

-- Bot GM styles: contenders pay to keep talent, rebuilders keep youth, balanced is in between.
alter table public.teams add column gm_style text not null default 'balanced' check (gm_style in ('contender', 'balanced', 'rebuilding'));
update public.teams set gm_style = case when overall_rank <= 4 then 'contender' when overall_rank >= 12 then 'rebuilding' else 'balanced' end;

-- Money math (same formulas as the website's lib/marketValue.js) ------------------------------------------------
create or replace function public.round5k(n numeric) returns int language sql immutable set search_path = '' as $$
  select greatest(10000, (round(n / 5000) * 5000)::int)
$$;

create or replace function public.fmt_k(n int) returns text language sql immutable set search_path = '' as $$
  select '$' || case when n >= 1000000 then to_char(n / 1000000.0, 'FM990.00') || 'M' else (n / 1000)::text || 'K' end
$$;

create or replace function public.market_value(p public.players) returns int language sql stable set search_path = '' as $$
  select public.round5k(
    (case p.stars when 1.5 then 40000 when 2 then 50000 when 2.5 then 65000 when 3 then 85000 when 3.5 then 100000
                  when 4 then 125000 when 4.5 then 160000 when 5 then 210000 else 50000 end)
    * (case when p.elite then 1.15 else 1 end)
    * (case p.position when 'QB' then 1.25 when 'WR' then 1.1 when 'DE' then 1.1 when 'OT' then 1.1
                       when 'TE' then 0.9 when 'OG' then 0.9 when 'C' then 0.9 when 'DT' then 0.9 when 'SS' then 0.9 else 1 end)
    * (case p.age when 21 then 0.9 when 22 then 0.9 when 26 then 0.95 when 27 then 0.85 else 1 end)
    * (case when p.depth = 'backup' then 0.85 else 1 end))
$$;

create or replace function public.ask_price(p public.players) returns int language plpgsql stable security definer set search_path = '' as $$
declare pot numeric; t public.player_traits; growth numeric := 1;
begin
  select potential into pot from public.player_potential where player_id = p.id;
  select * into t from public.player_traits where player_id = p.id;
  if p.age <= 24 and pot > p.stars then growth := 1 + 0.15 * (pot - p.stars); end if;
  return least(1000000, public.round5k(public.market_value(p) * growth * coalesce(t.greed, 1)
    * (case p.mood when 'angry' then 1.12 when 'unhappy' then 1.08 when 'happy' then 0.95 when 'excited' then 0.92 else 1 end)));
end $$;

-- Longest deal he can sign: seasons through the max age. What he'd like: rising young players bet on themselves.
create or replace function public.max_years(p public.players) returns int language sql stable set search_path = '' as $$
  select greatest(1, least(3, coalesce(public.setting_int('max_age'), 27) - coalesce(p.age, 25) + 1))
$$;

create or replace function public.preferred_years(p public.players) returns int language sql stable security definer set search_path = '' as $$
  select least(public.max_years(p), case
    when p.age <= 23 and coalesce((select potential from public.player_potential where player_id = p.id), p.stars) > p.stars then 2
    when p.age <= 25 then 3 else 1 end)
$$;

-- The lowest yearly amount he'd take from a team, for a given length and role. Non-money wishes (a starting job,
-- a winning team) and loyalty to his current team bring it down; stars give the least, depth players the most.
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
            + (case when p.team_id = p_team then t.loyalty * 0.08 else 0 end);
  return public.round5k(public.ask_price(p) * (1 - discount + abs(p_years - public.preferred_years(p)) * 0.04));
end $$;
