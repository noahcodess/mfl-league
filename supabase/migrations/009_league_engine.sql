-- League engine: contracts with history, a permanent event log, undo snapshots, and the offseason as server steps.
-- Built to run any number of seasons: nothing here is tied to a specific season number.

-- Player status: active (on a team or unsigned on his team's rights), free agent, or retired (kept for history).
alter table public.players add column status text not null default 'active' check (status in ('active', 'free_agent', 'retired'));

create table public.contracts (
  id bigint generated always as identity primary key,
  player_id text not null references public.players(id) on delete cascade,
  team_id text references public.teams(id) on update cascade,
  first_season int not null,
  last_season int not null,
  per_year int not null check (per_year >= 0),
  total int not null check (total between 0 and 1000000),
  status text not null default 'active' check (status in ('active', 'expired', 'released', 'retired')),
  source text not null default 'import',
  created_at timestamptz not null default now(),
  check (last_season >= first_season and last_season - first_season <= 2)
);
create unique index contracts_one_active on public.contracts(player_id) where status = 'active';
create index contracts_team_idx on public.contracts(team_id);

-- Imported deals: the Discord years included Season 7, so a 1-year deal ran through Season 7.
insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source)
select id, team_id, 7, 7 + contract_years - 1, round(contract_total::numeric / contract_years), contract_total, 'import'
from public.players where contract_years is not null and contract_total is not null;

create table public.league_events (
  id bigint generated always as identity primary key,
  season int not null,
  phase text not null,
  kind text not null,
  player_id text references public.players(id) on delete set null,
  team_id text references public.teams(id) on update cascade,
  summary text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index league_events_season_idx on public.league_events(season, id);

create table public.league_snapshots (
  id bigint generated always as identity primary key,
  label text not null,
  settings jsonb not null,
  players jsonb not null,
  contracts jsonb not null,
  last_event_id bigint not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

insert into public.league_settings (key, value) values ('offseason_step', '0') on conflict (key) do nothing;

alter table public.contracts enable row level security;
alter table public.league_events enable row level security;
alter table public.league_snapshots enable row level security; -- no policies: only the engine's functions touch it
create policy "anyone reads contracts" on public.contracts for select to anon, authenticated using (true);
create policy "commissioner writes contracts" on public.contracts for all to authenticated using (public.is_commissioner()) with check (public.is_commissioner());
create policy "anyone reads league events" on public.league_events for select to anon, authenticated using (true);
