-- Coaches: one per team, with a pixel avatar (face + outfit) and 5 coach ratings that make up his star rating:
-- Motivation, Clutch, Legacy, Recruiting, Game Planning (all slight effects). Coaches run by people have 5★ potential.

create table if not exists public.coaches (
  team_id text primary key references public.teams(id),
  name text not null,
  looks jsonb not null default '{}',
  ratings jsonb not null default '{}',     -- motivation, clutch, legacy, recruiting, game_planning (0-100)
  potential numeric not null default 3,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.coaches enable row level security;
create policy coaches_read on public.coaches for select using (true);

-- Stars from the 5 ratings, the same scale players use (a 3★ averages about 67).
create or replace function public.coach_stars(p_ratings jsonb) returns numeric language sql immutable set search_path = '' as $$
  select greatest(0.5, least(5, round(((coalesce((p_ratings->>'motivation')::numeric, 50) + coalesce((p_ratings->>'clutch')::numeric, 50)
    + coalesce((p_ratings->>'legacy')::numeric, 50) + coalesce((p_ratings->>'recruiting')::numeric, 50)
    + coalesce((p_ratings->>'game_planning')::numeric, 50)) / 5 - 28) / 13 * 2) / 2))
$$;

-- Legacy for now comes from last season's finish (more history counts once Noah sends the all-time records).
create or replace function public.coach_legacy_base(p_team text) returns int language sql stable security definer set search_path = '' as $$
  select coalesce((select case playoff when 'champion' then 78 when 'craft_bowl_loss' then 70 when 'conference' then 64 when 'divisional' then 58 else 48 end
    from public.team_seasons where team_id = p_team order by season desc limit 1), 50)
$$;

create or replace function public.make_coach_ratings(p_team text, p_stars numeric) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare t numeric := 28 + p_stars * 13;
  r int := floor(random() * 5)::int;
begin
  return jsonb_build_object(
    'motivation', least(99, greatest(25, round(t + (random() * 16 - 8))))::int,
    'clutch', least(99, greatest(25, round(t + (random() * 16 - 8))))::int,
    'legacy', public.coach_legacy_base(p_team),
    'recruiting', least(99, greatest(25, round(t + (random() * 16 - 8))))::int,
    'game_planning', least(99, greatest(25, round(t + (random() * 16 - 8))))::int);
end $$;

-- Every team gets a coach. Coach-run teams start around 3★ with 5★ potential; computer teams range 2-4.5★.
create or replace function public.ensure_coaches() returns int language plpgsql security definer set search_path = '' as $$
declare t record; human boolean; st numeric; n int := 0; nm text;
begin
  for t in select * from public.teams where not exists (select 1 from public.coaches c where c.team_id = teams.id) loop
    human := not public.is_bot_team(t.id);
    st := case when human then 3 else 2 + floor(random() * 6) / 2 end;
    nm := case when human then coalesce((select initcap(coalesce(display_name, username)) from public.profiles where team_id = t.id and role = 'coach' limit 1), public.random_name('USA'))
               else public.random_name('USA') end;
    insert into public.coaches (team_id, name, ratings, potential) values (t.id, nm, public.make_coach_ratings(t.id, st), case when human then 5 else st end);
    n := n + 1;
  end loop;
  return n;
end $$;

-- The coach changes his own outfit (shirt, pants, colors, sunglasses) and name. Face and hair are the commissioner's call.
create or replace function public.set_my_coach(p_name text, p_outfit jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); o jsonb := coalesce(p_outfit, '{}');
begin
  if me is null then raise exception 'Only a coach can change his coach'; end if;
  if p_name is not null and length(trim(p_name)) not between 2 and 30 then raise exception 'Name should be 2 to 30 letters'; end if;
  if o ? 'shirt' and o->>'shirt' not in ('hoodie', 'tee', 'polo', 'quarterzip', 'suit', 'jacket') then raise exception 'Unknown shirt'; end if;
  if o ? 'pants' and o->>'pants' not in ('sweats', 'jeans', 'khakis', 'slacks', 'shorts', 'cargo') then raise exception 'Unknown pants'; end if;
  if (o ? 'shirtColor' and o->>'shirtColor' !~ '^#[0-9a-fA-F]{6}$') or (o ? 'pantsColor' and o->>'pantsColor' !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Bad color'; end if;
  update public.coaches set name = coalesce(nullif(trim(p_name), ''), name),
    looks = looks || jsonb_strip_nulls(jsonb_build_object('shirt', o->>'shirt', 'shirtColor', o->>'shirtColor', 'pants', o->>'pants', 'pantsColor', o->>'pantsColor',
      'glasses', case when o ? 'glasses' then o->>'glasses' end)), updated_at = now()
  where team_id = me;
  return (select to_jsonb(c) from public.coaches c where team_id = me);
end $$;

-- Commissioner: change anything about any coach.
create or replace function public.set_coach(p_team text, p_name text, p_looks jsonb, p_ratings jsonb, p_potential numeric) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.coaches set name = coalesce(nullif(trim(p_name), ''), name), looks = looks || coalesce(p_looks, '{}'),
    ratings = ratings || coalesce(p_ratings, '{}'), potential = coalesce(p_potential, potential), updated_at = now()
  where team_id = p_team;
  return (select to_jsonb(c) from public.coaches c where team_id = p_team);
end $$;

select public.ensure_coaches();

-- Noah's Creepers coach: blond textured (mostly straight) hair, sunglasses, blue hoodie, black sweatpants.
update public.coaches set looks = '{"skin":"#f3cfb3","hair":"#d9b871","style":"messy","head":"oval","eyes":"#4f7fa8","eyeShape":"normal","brows":"normal","nose":"normal","mouth":"smirk","beard":"none","glasses":"sun","shirt":"hoodie","shirtColor":"#2f6fd6","pants":"sweats","pantsColor":"#1b1b1f"}'
where team_id = 'snm';

revoke execute on function public.make_coach_ratings(text, numeric), public.ensure_coaches(), public.coach_legacy_base(text) from public, anon, authenticated;
revoke execute on function public.set_my_coach(text, jsonb), public.set_coach(text, text, jsonb, jsonb, numeric) from public, anon;
grant execute on function public.set_my_coach(text, jsonb), public.set_coach(text, text, jsonb, jsonb, numeric) to authenticated;
grant execute on function public.coach_stars(jsonb) to anon, authenticated;

-- TEST mode backs up and restores coaches too.
do $$
declare d text; dl text := 'dele' || 'te from';
begin
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''inbox'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.inbox t));',
    '(''inbox'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.inbox t)),
    (''coaches'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.coaches t));');
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  ' || dl || ' public.league_schedule where true;', '  select rows into b from public.sandbox_backup where name = ''coaches'';
  if b is not null then ' || dl || ' public.coaches where true; insert into public.coaches select * from jsonb_populate_recordset(null::public.coaches, b); end if;
  ' || dl || ' public.league_schedule where true;');
  execute d;
end $$;
