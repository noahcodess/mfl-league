-- Coaches part 2: schemes (offense + defense, or Auto), coaches can only change their outfit and scheme (the commissioner
-- hears about every change), and number changes become requests the commissioner approves.

alter table public.coaches add column if not exists scheme jsonb not null default '{"auto": true, "offense": "balanced", "defense": "balanced"}';

-- The coach's own outfit (name and face are the commissioner's). Tells the commissioner.
create or replace function public.set_my_coach(p_name text, p_outfit jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); o jsonb := coalesce(p_outfit, '{}'); c public.coaches;
begin
  if me is null then raise exception 'Only a coach can change his coach'; end if;
  if o ? 'shirt' and o->>'shirt' not in ('hoodie', 'tee', 'polo', 'quarterzip', 'suit', 'jacket') then raise exception 'Unknown shirt'; end if;
  if o ? 'pants' and o->>'pants' not in ('sweats', 'jeans', 'khakis', 'slacks', 'shorts', 'cargo') then raise exception 'Unknown pants'; end if;
  if o ? 'glasses' and o->>'glasses' not in ('none', 'sun', 'clear') then raise exception 'Unknown glasses'; end if;
  if (o ? 'shirtColor' and o->>'shirtColor' !~ '^#[0-9a-fA-F]{6}$') or (o ? 'pantsColor' and o->>'pantsColor' !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Bad color'; end if;
  update public.coaches set looks = looks || jsonb_strip_nulls(jsonb_build_object('shirt', o->>'shirt', 'shirtColor', o->>'shirtColor',
      'pants', o->>'pants', 'pantsColor', o->>'pantsColor', 'glasses', o->>'glasses')), updated_at = now()
  where team_id = me returning * into c;
  perform public.notify(null, true, false, 'coach_edit', format('Coach %s changed his outfit', c.name),
    format('%s: %s + %s.', (select name from public.teams where id = me), c.looks->>'shirt', c.looks->>'pants'), jsonb_build_object('team', me));
  return to_jsonb(c);
end $$;

-- The coach's scheme: an offense and a defense style, or Auto (picked from his roster). Tells the commissioner.
create or replace function public.set_my_scheme(p_offense text, p_defense text, p_auto boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); c public.coaches;
begin
  if me is null then raise exception 'Only a coach can set his scheme'; end if;
  if p_offense not in ('air_raid', 'west_coast', 'balanced', 'ground_pound', 'spread_option') then raise exception 'Unknown offense'; end if;
  if p_defense not in ('blitz', 'man_press', 'balanced', 'zone', 'bend') then raise exception 'Unknown defense'; end if;
  update public.coaches set scheme = jsonb_build_object('auto', coalesce(p_auto, false), 'offense', p_offense, 'defense', p_defense), updated_at = now()
  where team_id = me returning * into c;
  perform public.notify(null, true, false, 'coach_edit', format('Coach %s changed his scheme', c.name),
    case when p_auto then 'Set to Auto.' else format('Offense: %s · Defense: %s', p_offense, p_defense) end, jsonb_build_object('team', me));
  return to_jsonb(c);
end $$;

-- Commissioner: change anything about any coach, including the scheme.
create or replace function public.set_coach_scheme(p_team text, p_scheme jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.coaches set scheme = scheme || coalesce(p_scheme, '{}'), updated_at = now() where team_id = p_team;
  return (select to_jsonb(c) from public.coaches c where team_id = p_team);
end $$;

-- Number change requests: the coach asks, the commissioner approves or denies.
create table if not exists public.number_requests (
  id bigint generated always as identity primary key, team_id text not null references public.teams(id), player_id text not null references public.players(id) on delete cascade,
  from_number int, to_number int not null check (to_number between 0 and 99),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')), created_at timestamptz not null default now(), decided_at timestamptz
);
alter table public.number_requests enable row level security;
create policy number_requests_read on public.number_requests for select using (team_id = public.my_team_id() or public.is_commissioner());

create or replace function public.request_number_change(p_player text, p_number int) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); pl public.players; rid bigint;
begin
  select * into pl from public.players where id = p_player;
  if me is null or pl.team_id is distinct from me then raise exception 'Only his coach can ask for that'; end if;
  if p_number is null or p_number < 0 or p_number > 99 then raise exception 'Pick a number from 0 to 99'; end if;
  if pl.number = p_number then raise exception 'He already wears %', p_number; end if;
  if exists (select 1 from public.players where team_id = me and status = 'active' and number = p_number) then raise exception 'Someone on your team already wears %', p_number; end if;
  if exists (select 1 from public.number_requests where player_id = p_player and status = 'pending') then raise exception 'There''s already a request waiting for him'; end if;
  insert into public.number_requests (team_id, player_id, from_number, to_number) values (me, p_player, pl.number, p_number) returning id into rid;
  perform public.notify(null, true, false, 'number_request', format('Number change: %s #%s → #%s', pl.name, coalesce(pl.number::text, '-'), p_number),
    format('The %s want to change his number.', (select name from public.teams where id = me)), jsonb_build_object('request', rid, 'team', me, 'player', p_player));
  return jsonb_build_object('request', rid);
end $$;

create or replace function public.decide_number_change(p_request bigint, p_approve boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.number_requests; nm text;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.number_requests where id = p_request for update;
  if r.status is distinct from 'pending' then raise exception 'That request was already decided'; end if;
  select name into nm from public.players where id = r.player_id;
  if p_approve then
    if exists (select 1 from public.players where team_id = r.team_id and status = 'active' and number = r.to_number and id <> r.player_id) then
      raise exception 'Someone on that team already wears %', r.to_number;
    end if;
    update public.players set number = r.to_number where id = r.player_id;
  end if;
  update public.number_requests set status = case when p_approve then 'approved' else 'denied' end, decided_at = now() where id = r.id;
  perform public.notify(r.team_id, false, false, 'number_' || case when p_approve then 'approved' else 'denied' end,
    format('%s''s number change to #%s was %s', nm, r.to_number, case when p_approve then 'approved' else 'denied' end), null, jsonb_build_object('player', r.player_id));
  return jsonb_build_object('approved', p_approve);
end $$;

revoke execute on function public.set_my_scheme(text, text, boolean), public.set_coach_scheme(text, jsonb), public.request_number_change(text, int), public.decide_number_change(bigint, boolean) from public, anon;
grant execute on function public.set_my_scheme(text, text, boolean), public.set_coach_scheme(text, jsonb), public.request_number_change(text, int), public.decide_number_change(bigint, boolean) to authenticated;

-- TEST mode backs up and restores number requests.
do $$
declare d text; dl text := 'dele' || 'te from';
begin
  d := pg_get_functiondef('public.sandbox_enter()'::regprocedure);
  d := replace(d, '(''coaches'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.coaches t));',
    '(''coaches'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.coaches t)),
    (''number_requests'', (select coalesce(jsonb_agg(to_jsonb(t)), ''[]'') from public.number_requests t));');
  execute d;
  d := pg_get_functiondef('public.sandbox_exit()'::regprocedure);
  d := replace(d, '  ' || dl || ' public.trade_items where true;', '  ' || dl || ' public.number_requests where true;
  ' || dl || ' public.trade_items where true;');
  d := replace(d, '  ' || dl || ' public.league_schedule where true;', '  select rows into b from public.sandbox_backup where name = ''number_requests'';
  insert into public.number_requests overriding system value select * from jsonb_populate_recordset(null::public.number_requests, coalesce(b, ''[]''));
  ' || dl || ' public.league_schedule where true;');
  execute d;
end $$;
