-- Accounts: coach and commissioner profiles, the commissioner key, unlocks and failed-attempt lockout.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  role text not null check (role in ('coach', 'commissioner')),
  team_id text references public.teams(id) on update cascade,
  display_name text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- Only a bcrypt hash of the key is stored. Nobody can read it back, not even the site owner.
create table public.commish_key (
  id int primary key default 1 check (id = 1),
  key_hash text not null,
  set_at timestamptz not null default now()
);

create table public.commish_unlocks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table public.commish_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed int not null default 0,
  locked_until timestamptz
);

alter table public.profiles enable row level security;
alter table public.commish_key enable row level security;
alter table public.commish_unlocks enable row level security;
alter table public.commish_attempts enable row level security;
-- commish_* tables get no policies on purpose: the browser can never touch them directly.
