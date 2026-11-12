-- 063: Every team's stadium: name and capacity (attendance and "stadium pulse" come later). Fields all look the same in the game;
-- only the midfield logo and the end zones change by team. The commissioner can rename a stadium or change its capacity.
create table if not exists public.stadiums (
  team_id text primary key references public.teams(id), name text not null, capacity int not null check (capacity between 1000 and 200000),
  updated_at timestamptz not null default now());
alter table public.stadiums enable row level security;
drop policy if exists "anyone reads stadiums" on public.stadiums;
create policy "anyone reads stadiums" on public.stadiums for select using (true);

insert into public.stadiums (team_id, name, capacity) values
  ('crf', 'The Crimson Crown', 92000), ('snm', 'Death Valley', 85000), ('void', 'The Abyss', 78500), ('ntw', 'The Bone Yard', 76000),
  ('ddc', 'The Warden''s Den', 72500), ('edc', 'Purpur Park', 70000), ('lsc', 'The Grotto', 68000), ('tga', 'Spruce Hollow', 66500),
  ('ocm', 'Prismarine Stadium', 65000), ('wrf', 'Warped Field', 63500), ('drf', 'The Crypt', 62000), ('pln', 'The Pigpen', 61000),
  ('wsl', 'Phantom Field', 60000), ('ocn', 'Riptide Stadium', 59500), ('flf', 'Iron Garden', 58500), ('dst', 'The Web', 57000)
on conflict (team_id) do nothing;

create or replace function public.commish_set_stadium(p_team text, p_name text, p_capacity int) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 40 then raise exception 'Give the stadium a name (2 to 40 letters)'; end if;
  if p_capacity is null or p_capacity not between 1000 and 200000 then raise exception 'Capacity goes from 1,000 to 200,000'; end if;
  insert into public.stadiums (team_id, name, capacity, updated_at) values (p_team, trim(p_name), p_capacity, now())
  on conflict (team_id) do update set name = excluded.name, capacity = excluded.capacity, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.commish_set_stadium(text, text, int) to authenticated;
