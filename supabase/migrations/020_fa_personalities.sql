-- More varied players, and grudges.
-- Personalities: ring chaser, prove-it, hometown, starter or bust, knows his worth (diva), money first, or balanced.
-- Grudges: a team that let a player go has a hard time getting him back in free agency, fading after a season:
--   let go (no offer at all) = usually refuses ("Crawling back to me?"), otherwise +40%; talks failed = +15%; he walked = +10%.
-- His interest decides everything: the top of the bidding board always wins.

create or replace function public.random_archetype() returns text language plpgsql volatile set search_path = '' as $$
declare r numeric := random();
begin
  return case when r < 0.38 then 'none' when r < 0.48 then 'ring_chaser' when r < 0.60 then 'prove_it' when r < 0.70 then 'hometown'
              when r < 0.82 then 'starter_only' when r < 0.90 then 'diva' else 'mercenary' end;
end $$;

create or replace function public.random_team_id() returns text language sql volatile security definer set search_path = '' as $$
  select id from public.teams order by random() limit 1
$$;

alter table public.player_traits
  add column archetype text not null default 'none' check (archetype in ('none', 'ring_chaser', 'prove_it', 'hometown', 'starter_only', 'diva', 'mercenary')),
  add column favorite_team text references public.teams(id) on update cascade;
update public.player_traits set archetype = public.random_archetype(), favorite_team = public.random_team_id();
alter table public.player_traits alter column archetype set default public.random_archetype(), alter column favorite_team set default public.random_team_id();

alter table public.players add column left_how text check (left_how in ('let_go', 'talks_failed', 'walked')), add column left_season int;

-- How a player left his old team, decided when he hits free agency.
create or replace function public.fa_left_how(p_player text, p_team text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare p public.players;
begin
  select * into p from public.players where id = p_player;
  if public.wants_to_test_market(p) then return 'walked'; end if;
  if exists (select 1 from public.negotiations g where g.player_id = p.id and g.team_id = p_team and g.kind = 'resign'
             and g.season = public.setting_int('current_season')) then return 'talks_failed'; end if;
  return 'let_go';
end $$;

-- Price multiplier for his old team (1 = no grudge, 0 = won't even talk). Full this offseason, half next, then gone.
create or replace function public.fa_grudge(p public.players, p_team text) returns numeric
language plpgsql stable security definer set search_path = '' as $$
declare since int; w numeric;
begin
  if p.status <> 'free_agent' or p.left_how is null or p.previous_team_id is distinct from p_team then return 1; end if;
  since := public.setting_int('current_season') - coalesce(p.left_season, 0);
  if since > 1 then return 1; end if;
  w := case when since = 0 then 1 else 0.5 end;
  if p.left_how = 'let_go' then
    if since = 0 and abs(hashtext(p.id || p_team || p.left_season::text)) % 100 < 70 then return 0; end if;
    return 1 + 0.4 * w;
  end if;
  return 1 + (case when p.left_how = 'talks_failed' then 0.15 else 0.10 end) * w;
end $$;

create or replace function public.fa_grudge_line(p public.players, p_team text) returns text language sql stable set search_path = '' as $$
  select (array['Crawling back to me? You had your chance, Coach.', 'Now you want me? You didn''t even call during re-signing.',
                'Nah. You let me walk. Go find someone else.', 'Funny how I''m good enough now. Pass.'])[1 + abs(hashtext(p.id || p_team)) % 4]
$$;

create or replace function public.preferred_years(p public.players) returns int language sql stable security definer set search_path = '' as $$
  select least(public.max_years(p), case
    when (select archetype from public.player_traits where player_id = p.id) = 'prove_it' then 1
    when p.age <= 23 and coalesce((select potential from public.player_potential where player_id = p.id), p.stars) > p.stars then 2
    when p.age <= 25 then 3 else 1 end)
$$;

-- What he needs from a team, now with personality and grudges. Loyalty only helps his current team (re-signing).
create or replace function public.required_price(p public.players, p_team text, p_years int, p_role text) returns int
language plpgsql stable security definer set search_path = '' as $$
declare t public.player_traits; team_stars numeric; pt numeric; lg numeric; non_money numeric; flex numeric; discount numeric;
  mult numeric := 1; term numeric; grudge numeric;
begin
  select * into t from public.player_traits where player_id = p.id;
  select overall_stars into team_stars from public.teams where id = p_team;
  pt := case when p_role = 'starter' then 1 when p.stars >= 4 then 0.2 when p.stars >= 3 then 0.5 else 0.8 end;
  lg := least(1, coalesce(team_stars, 3) / 5.0);
  non_money := (t.playing_time * pt + t.legacy * lg) / nullif(t.playing_time + t.legacy, 0);
  flex := case when p.stars >= 4.5 then 0.5 when p.stars <= 2.5 then 1.3 else 1 end;
  discount := case when t.archetype = 'mercenary' then -0.05 else (1 - t.money) * (coalesce(non_money, 0.5) - 0.5) * 0.4 * flex end
            + (case when p.team_id = p_team then t.loyalty * 0.08 else 0 end);
  if t.archetype = 'ring_chaser' then
    mult := case when team_stars >= 4 then 0.82 when team_stars >= 3.5 then 0.92 when team_stars < 3 then 1.15 else 1 end;
  elsif t.archetype = 'hometown' and t.favorite_team = p_team then mult := 0.85;
  elsif t.archetype = 'starter_only' and p_role = 'backup' then mult := 1.35;
  end if;
  term := case when t.archetype = 'prove_it' then 0.12 * (p_years - 1) else abs(p_years - public.preferred_years(p)) * 0.04 end;
  grudge := public.fa_grudge(p, p_team);
  if grudge = 0 then return 1000000; end if; -- won't talk to you
  return public.round5k(public.ask_price(p) * mult * grudge * (1 - discount + term));
end $$;

-- Board sorted by his real interest (the meter caps at 100, the order doesn't): the top row is who he signs with.
create or replace function public.fa_board(p_player text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.players; desp numeric := public.fa_desperation(public.setting_int('fa_round') + 1);
begin
  select * into p from public.players where id = p_player;
  if p.id is null then return '[]'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('team_id', team_id, 'years', years, 'per_year', per_year, 'role', role,
      'interest', least(100, round(80 * score))::int, 'mine', team_id = public.my_team_id()) order by score desc, per_year desc) from (
    select o.*, o.per_year::numeric / nullif(public.required_price(p, o.team_id, o.years, o.role) * desp, 0) as score
    from public.fa_offers o where o.player_id = p.id and o.status = 'open') x), '[]');
end $$;

do $$
declare d text;
begin
  -- Hitting free agency records how he left.
  d := pg_get_functiondef('public.advance_offseason()'::regprocedure);
  execute replace(d, 'set status = ''free_agent'', previous_team_id = r.team_id,',
                     'set status = ''free_agent'', previous_team_id = r.team_id, left_season = season, left_how = public.fa_left_how(r.id, r.team_id),');
  -- A player holding a grudge won't take your offer.
  d := pg_get_functiondef('public.make_fa_offer(text,int,int,text)'::regprocedure);
  execute replace(d, 'if p_years not between 1 and 3 then',
                     'if public.fa_grudge(p, my_team) = 0 then raise exception ''%'', public.fa_grudge_line(p, my_team); end if;
  if p_years not between 1 and 3 then');
  -- Players who know they're in demand wait longer when several teams are bidding.
  d := pg_get_functiondef('public.run_fa_round()'::regprocedure);
  execute replace(d, 'if rnd = 1 and pl.stars >= 4 and t.patience >= 3 and ofr.score < 1.15 then',
                     'if (rnd = 1 and pl.stars >= 4 and t.patience >= 3 and ofr.score < 1.15)
         or (t.archetype = ''diva'' and rnd <= 2 and pl.stars >= 3.5 and ofr.score < 1.25
             and (select count(*) from public.fa_offers z where z.player_id = pl.id and z.status = ''open'') >= 3) then');
  -- The quote tells coaches what kind of player he is, his favorite team, and whether he holds a grudge against them.
  d := pg_get_functiondef('public.fa_quote(text)'::regprocedure);
  execute replace(d, '''interest'', (select count(*)',
    '''type'', (select archetype from public.player_traits where player_id = p.id),
    ''favorite_team'', (select favorite_team from public.player_traits where player_id = p.id),
    ''grudge'', case when my_team is null then null else public.fa_grudge(p, my_team) end,
    ''grudge_line'', case when my_team is not null and public.fa_grudge(p, my_team) = 0 then public.fa_grudge_line(p, my_team) end,
    ''left_how'', case when p.previous_team_id = my_team then p.left_how end,
    ''interest'', (select count(*)');
end $$;

revoke execute on function public.random_archetype(), public.random_team_id(), public.fa_left_how(text, text),
  public.fa_grudge(public.players, text), public.fa_grudge_line(public.players, text) from public, anon, authenticated;
