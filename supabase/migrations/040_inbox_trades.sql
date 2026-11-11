-- Inbox (messages for a coach, the commissioner, or the whole league) and the trade system:
-- trades with up to 5 items a side (players and draft picks), untouchables (2 per team), the trade block,
-- and the trade window (open after re-signing, closes at the deadline the commissioner sets after Week 8).

create table if not exists public.inbox (
  id bigint generated always as identity primary key,
  team_id text references public.teams(id), to_commish boolean not null default false, to_all boolean not null default false,
  kind text not null, title text not null, body text, data jsonb, created_at timestamptz not null default now()
);
create table if not exists public.inbox_reads (user_id uuid not null, last_read_id bigint not null default 0, primary key (user_id));
alter table public.inbox enable row level security;
alter table public.inbox_reads enable row level security;
create policy inbox_read on public.inbox for select using (to_all or team_id = public.my_team_id() or (to_commish and public.is_commissioner()));
create policy inbox_reads_own on public.inbox_reads for select using (user_id = auth.uid());

create or replace function public.inbox_mark_read(p_last bigint) returns void
language sql security definer set search_path = '' as $$
  insert into public.inbox_reads (user_id, last_read_id) select auth.uid(), p_last where auth.uid() is not null
  on conflict (user_id) do update set last_read_id = greatest(public.inbox_reads.last_read_id, excluded.last_read_id);
$$;

create or replace function public.notify(p_team text, p_commish boolean, p_all boolean, p_kind text, p_title text, p_body text, p_data jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.inbox (team_id, to_commish, to_all, kind, title, body, data) values (p_team, p_commish, p_all, p_kind, p_title, p_body, p_data);
$$;

create table if not exists public.trades (
  id bigint generated always as identity primary key, season int not null,
  from_team text not null references public.teams(id), to_team text not null references public.teams(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'vetoed', 'expired')),
  note text, decided_by text, created_at timestamptz not null default now(), decided_at timestamptz
);
create table if not exists public.trade_items (
  id bigint generated always as identity primary key, trade_id bigint not null references public.trades(id) on delete cascade,
  side text not null check (side in ('give', 'get')),     -- give = from_team sends it; get = to_team sends it
  player_id text references public.players(id), pick_id bigint references public.picks(id),
  check ((player_id is null) <> (pick_id is null))
);
create table if not exists public.untouchables (team_id text not null references public.teams(id), player_id text primary key references public.players(id) on delete cascade);
create table if not exists public.trade_block (team_id text not null references public.teams(id), player_id text primary key references public.players(id) on delete cascade, added_at timestamptz not null default now());
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;
alter table public.untouchables enable row level security;
alter table public.trade_block enable row level security;
create policy trades_read on public.trades for select using (from_team = public.my_team_id() or to_team = public.my_team_id() or public.is_commissioner() or status = 'accepted');
create policy trade_items_read on public.trade_items for select using (exists (select 1 from public.trades t where t.id = trade_id));
create policy untouchables_read on public.untouchables for select using (true);
create policy trade_block_read on public.trade_block for select using (true);

insert into public.league_settings (key, value) values ('trade_max_items', '5'), ('trade_window', '"auto"'), ('untouchable_max', '2'), ('trade_block_alert_stars', '3.5')
on conflict (key) do nothing;

-- Open after re-signing (from free agency on) through the season until the trade deadline. The commissioner can force it open or shut.
create or replace function public.trades_open() returns boolean language sql stable security definer set search_path = '' as $$
  select case (select value #>> '{}' from public.league_settings where key = 'trade_window')
    when 'open' then true when 'closed' then false
    else (
      ((select value #>> '{}' from public.league_settings where key = 'phase') = 'offseason' and public.setting_int('offseason_step') >= 3)
      or ((select value #>> '{}' from public.league_settings where key = 'phase') = 'regular_season'
          and not exists (select 1 from public.league_schedule where season = public.setting_int('current_season') and kind = 'trade_deadline' and starts_at <= now())))
  end
$$;

-- Is this pick still unused and tradeable? (Not used in a draft, and not the pick on the clock right now.)
create or replace function public.pick_tradeable(p_pick bigint) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.picks k join public.teams t on upper(t.code) = upper(k.original_code)
    where k.id = p_pick
      and not exists (select 1 from public.draft_selections s where s.season = k.season and s.round = k.round and s.original_team_id = t.id and s.status <> 'denied')
      and not exists (select 1 from public.draft_room r join public.draft_slots(r.season) sl on sl.pick_no = r.pick_no
                      where r.season = k.season and r.status <> 'done' and sl.round = k.round and sl.original_team_id = t.id)
      and (k.season > public.setting_int('current_season') or not exists (select 1 from public.draft_room r where r.season = k.season and r.status = 'done')))
$$;

revoke execute on function public.notify(text, boolean, boolean, text, text, text, jsonb), public.pick_tradeable(bigint) from public, anon, authenticated;
revoke execute on function public.inbox_mark_read(bigint), public.trades_open() from public, anon;
grant execute on function public.inbox_mark_read(bigint), public.trades_open() to authenticated;
grant execute on function public.trades_open() to anon;
