-- League data: settings, teams, players, hidden potential, draft picks, import problems.
create table public.league_settings (
  key text primary key,
  value jsonb not null
);

create table public.teams (
  id text primary key,
  code text not null unique,
  name text not null,
  conference text check (conference in ('Overworld', 'Nether')),
  color text,
  accent text,
  offense_stars numeric(2,1), offense_rank int,
  defense_stars numeric(2,1), defense_rank int,
  overall_stars numeric(2,1), overall_rank int,
  cap_used_reported int,
  is_bot boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.players (
  id text primary key,
  team_id text references public.teams(id) on update cascade,
  name text not null,
  position text not null,
  depth text check (depth in ('starter', 'backup')),
  slot int,
  stars numeric(2,1),
  elite boolean not null default false,
  age int,
  contract_years int,
  contract_total int,
  mood text,
  nationality text not null default 'USA',
  notes text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index players_team_idx on public.players(team_id);

-- Potential is hidden: only the owning coach (or a scout, later) and the commissioner can read it.
create table public.player_potential (
  player_id text primary key references public.players(id) on delete cascade,
  potential numeric(2,1) not null
);

create table public.picks (
  id bigint generated always as identity primary key,
  owner_id text not null references public.teams(id) on update cascade,
  original_code text not null,
  season int not null,
  round int not null check (round between 1 and 3)
);
create index picks_owner_idx on public.picks(owner_id);

create table public.import_issues (
  id bigint generated always as identity primary key,
  kind text not null,
  team_id text references public.teams(id) on update cascade,
  text text not null,
  level text not null
);

alter table public.league_settings enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.player_potential enable row level security;
alter table public.picks enable row level security;
alter table public.import_issues enable row level security;
