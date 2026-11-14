-- 073: Injury ratings for the game engine. Durability = how hard a player is to hurt, Recovery = how fast he comes back.
-- Both start from Toughness and age with a little luck. Everyone can see them, like the other ratings.
-- seed_injury_ratings() fills in anyone who doesn't have them yet (run it again after a new draft class is added).
create table if not exists public.player_injury_ratings (
  player_id text primary key references public.players(id) on delete cascade,
  durability int not null check (durability between 25 and 99),
  recovery int not null check (recovery between 25 and 99),
  updated_at timestamptz not null default now()
);
alter table public.player_injury_ratings enable row level security;
create policy "anyone reads injury ratings" on public.player_injury_ratings for select to anon, authenticated using (true);

create or replace function public.seed_injury_ratings() returns int
language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  insert into public.player_injury_ratings (player_id, durability, recovery)
  select p.id,
    greatest(25, least(99, round(coalesce((a.ratings->>'toughness')::numeric, 60) * 0.55 + 30 + random() * 24 - 12 - greatest(0, coalesce(p.age, 25) - 29) * 1.5)))::int,
    greatest(25, least(99, round(60 + random() * 30 - 15 + coalesce((a.ratings->>'toughness')::numeric, 60) * 0.15 - greatest(0, coalesce(p.age, 25) - 28) * 2)))::int
  from public.players p left join public.player_attributes a on a.player_id = p.id
  where not exists (select 1 from public.player_injury_ratings r where r.player_id = p.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.seed_injury_ratings() from public, anon, authenticated;
select public.seed_injury_ratings();
