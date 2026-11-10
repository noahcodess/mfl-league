-- Player attributes: 9 ratings (1-99) per player: 6 for his position plus Speed, Stamina and Toughness (injuries).
-- Built from his stars (Toughness is mostly its own roll: stars don't make you durable). Everyone can see them.
-- Each rating also has a ceiling (how high it can grow), built from his potential. Ceilings live with potential,
-- so they stay hidden the same way: own team, commissioner and site owner (scouting will open them later).

create table public.attribute_defs (position text not null, ord int not null, key text not null, label text not null, primary key (position, key));
alter table public.attribute_defs enable row level security;
create policy "anyone reads attribute names" on public.attribute_defs for select to anon, authenticated using (true);

create table public.player_attributes (
  player_id text primary key references public.players(id) on delete cascade,
  ratings jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.player_attributes enable row level security;
create policy "anyone reads attributes" on public.player_attributes for select to anon, authenticated using (true);
alter table public.player_potential add column ceilings jsonb;

-- Average rating for a star level: 1 star ~41, 2 ~54, 3 ~67, 4 ~80, 5 ~93.
create or replace function public.rating_target(p_stars numeric) returns numeric language sql immutable set search_path = '' as $$
  select 28 + coalesce(p_stars, 2) * 13
$$;

-- Ceilings: each rating can grow by about the gap between his potential and his stars, some more, some less.
create or replace function public.refresh_ceilings(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.players; pot numeric; r jsonb; gap numeric; k text; v int; out jsonb := '{}';
begin
  select * into p from public.players where id = p_id;
  select potential into pot from public.player_potential where player_id = p_id;
  select ratings into r from public.player_attributes where player_id = p_id;
  if r is null or pot is null then return; end if;
  gap := public.rating_target(greatest(pot, p.stars)) - public.rating_target(p.stars);
  for k, v in select key, value::int from jsonb_each_text(r) loop
    out := out || jsonb_build_object(k, least(99, greatest(v, round(v + gap * (0.6 + random() * 0.8)))));
  end loop;
  update public.player_potential set ceilings = out where player_id = p_id;
end $$;

-- Ratings: around his star level, with natural ups and downs between attributes.
create or replace function public.generate_attributes(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare p public.players; target numeric; d record; raw numeric[] := '{}'; keys text[] := '{}'; shift numeric; i int; out jsonb := '{}';
begin
  select * into p from public.players where id = p_id;
  if p.id is null then return; end if;
  target := public.rating_target(p.stars) + (case when p.elite then 2 else 0 end);
  for d in select key from public.attribute_defs where position = p.position order by ord loop
    keys := keys || d.key;
    raw := raw || ((random() + random() + random() - 1.5) * 16)::numeric;
  end loop;
  if array_length(keys, 1) is null then return; end if;
  select avg(x) into shift from unnest(raw) x;
  for i in 1 .. array_length(keys, 1) loop
    out := out || jsonb_build_object(keys[i], least(99, greatest(25, round(case
      when keys[i] = 'toughness' then 50 + random() * 45 + (target - 67) * 0.15 -- injury luck, barely tied to stars
      when keys[i] = 'stamina' then (target + raw[i] - shift) * 0.5 + (50 + random() * 45) * 0.5
      else target + raw[i] - shift end)))::int);
  end loop;
  insert into public.player_attributes (player_id, ratings) values (p_id, out)
    on conflict (player_id) do update set ratings = excluded.ratings, updated_at = now();
  perform public.refresh_ceilings(p_id);
end $$;

create or replace function public.players_make_attributes() returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.generate_attributes(new.id); return new; end $$;
create trigger players_make_attributes after insert on public.players for each row execute function public.players_make_attributes();

create or replace function public.potential_make_ceilings() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.potential is distinct from old.potential then perform public.refresh_ceilings(new.player_id); end if;
  return new;
end $$;
create trigger potential_make_ceilings after insert or update of potential on public.player_potential
  for each row execute function public.potential_make_ceilings();

revoke execute on function public.rating_target(numeric), public.refresh_ceilings(text), public.generate_attributes(text),
  public.players_make_attributes(), public.potential_make_ceilings() from public, anon, authenticated;
