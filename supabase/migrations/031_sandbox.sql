-- TEST mode (sandbox) for the commissioner. Turning it on saves a full copy of the league; the whole site turns
-- green so everyone knows nothing is real; every step, round and deal works exactly like the real thing. Turning it
-- off puts the league back exactly as it was. (Logins and accounts are not part of the copy.)

create table public.sandbox_backup (name text primary key, rows jsonb not null, saved_at timestamptz not null default now());
alter table public.sandbox_backup enable row level security; -- no policies: only the functions below touch it

insert into public.league_settings (key, value) values ('sandbox', 'false') on conflict (key) do nothing;

create or replace function public.sandbox_enter() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'sandbox') = 'true' then raise exception 'TEST mode is already on'; end if;
  delete from public.sandbox_backup where true;
  insert into public.sandbox_backup (name, rows) values
    ('league_settings', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.league_settings t)),
    ('teams', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.teams t)),
    ('players', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.players t)),
    ('picks', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.picks t)),
    ('contracts', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.contracts t)),
    ('negotiations', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.negotiations t)),
    ('fa_offers', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.fa_offers t)),
    ('player_attributes', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.player_attributes t)),
    ('player_potential', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.player_potential t)),
    ('player_traits', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.player_traits t)),
    ('scout_reports', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.scout_reports t)),
    ('league_events', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.league_events t)),
    ('league_snapshots', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.league_snapshots t));
  update public.league_settings set value = 'true' where key = 'sandbox';
  perform public.log_event('sandbox', null, null, 'TEST mode is on. Nothing that happens now is real.');
  return jsonb_build_object('sandbox', true);
end $$;

create or replace function public.sandbox_exit() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare b jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.sandbox_backup where name = 'players') then raise exception 'TEST mode is not on'; end if;
  -- Put everything back without re-running the "new player" machinery (traits, bars, bodies).
  alter table public.players disable trigger players_make_traits;
  alter table public.players disable trigger players_make_attributes;
  alter table public.player_potential disable trigger potential_make_ceilings;

  delete from public.scout_reports where true;
  delete from public.fa_offers where true;
  delete from public.negotiations where true;
  delete from public.contracts where true;
  delete from public.player_attributes where true;
  delete from public.player_potential where true;
  delete from public.player_traits where true;
  delete from public.league_events where true;
  delete from public.league_snapshots where true;
  delete from public.picks where true;
  delete from public.players where true;

  select rows into b from public.sandbox_backup where name = 'players';
  insert into public.players select * from jsonb_populate_recordset(null::public.players, b);
  select rows into b from public.sandbox_backup where name = 'picks';
  insert into public.picks overriding system value select * from jsonb_populate_recordset(null::public.picks, b);
  select rows into b from public.sandbox_backup where name = 'contracts';
  insert into public.contracts overriding system value select * from jsonb_populate_recordset(null::public.contracts, b);
  select rows into b from public.sandbox_backup where name = 'negotiations';
  insert into public.negotiations overriding system value select * from jsonb_populate_recordset(null::public.negotiations, b);
  select rows into b from public.sandbox_backup where name = 'fa_offers';
  insert into public.fa_offers overriding system value select * from jsonb_populate_recordset(null::public.fa_offers, b);
  select rows into b from public.sandbox_backup where name = 'player_attributes';
  insert into public.player_attributes select * from jsonb_populate_recordset(null::public.player_attributes, b);
  select rows into b from public.sandbox_backup where name = 'player_potential';
  insert into public.player_potential select * from jsonb_populate_recordset(null::public.player_potential, b);
  select rows into b from public.sandbox_backup where name = 'player_traits';
  insert into public.player_traits select * from jsonb_populate_recordset(null::public.player_traits, b);
  select rows into b from public.sandbox_backup where name = 'scout_reports';
  insert into public.scout_reports overriding system value select * from jsonb_populate_recordset(null::public.scout_reports, b);
  select rows into b from public.sandbox_backup where name = 'league_events';
  insert into public.league_events overriding system value select * from jsonb_populate_recordset(null::public.league_events, b);
  select rows into b from public.sandbox_backup where name = 'league_snapshots';
  insert into public.league_snapshots overriding system value select * from jsonb_populate_recordset(null::public.league_snapshots, b);

  select rows into b from public.sandbox_backup where name = 'teams';
  update public.teams t set gm_style = x.gm_style, offense_stars = x.offense_stars, offense_rank = x.offense_rank,
    defense_stars = x.defense_stars, defense_rank = x.defense_rank, overall_stars = x.overall_stars, overall_rank = x.overall_rank,
    cap_used_reported = x.cap_used_reported, is_bot = x.is_bot, reserved = x.reserved
  from jsonb_populate_recordset(null::public.teams, b) x where t.id = x.id;

  select rows into b from public.sandbox_backup where name = 'league_settings';
  delete from public.league_settings where true;
  insert into public.league_settings select * from jsonb_populate_recordset(null::public.league_settings, b);
  update public.league_settings set value = 'false' where key = 'sandbox';

  alter table public.players enable trigger players_make_traits;
  alter table public.players enable trigger players_make_attributes;
  alter table public.player_potential enable trigger potential_make_ceilings;
  delete from public.sandbox_backup where true;
  return jsonb_build_object('sandbox', false);
end $$;

revoke execute on function public.sandbox_enter(), public.sandbox_exit() from public, anon;
grant execute on function public.sandbox_enter(), public.sandbox_exit() to authenticated;
