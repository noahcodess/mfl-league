-- 058: Development rules and jerseys.
-- Birthday: players 25 and under go up 1 star (never past their potential). 25 year olds first roll for regression
-- (about 38% overall, more for backups and weaker players); if they drop, no growth that year. 26 and 27 never grow.
-- Jerseys: 4 per team (Home, Away, two named alternates). Coaches request changes, the commissioner approves or edits directly.

create or replace function public.develop_players() returns integer
language plpgsql security definer set search_path to '' as $$
declare r record; new_stars numeric; share numeric; old jsonb; out jsonb; k text; v int; made int := 0;
  power_gain numeric; speed_gain numeric; dw numeric; cs int := public.setting_int('current_season');
begin
  for r in select p.*, pp.potential as pot, pp.ceilings from public.players p join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and pp.potential > p.stars and p.age <= 25
             and p.last_drop_season is distinct from cs loop
    new_stars := least(r.pot, r.stars + 1);
    continue when new_stars <= r.stars;
    share := (new_stars - r.stars) / (r.pot - r.stars);
    select ratings into old from public.player_attributes where player_id = r.id;
    if old is not null then
      out := '{}';
      for k, v in select key, value::int from jsonb_each_text(old) loop
        out := out || jsonb_build_object(k, least(99, v + greatest(0, round((coalesce((r.ceilings->>k)::int, v) - v) * share))));
      end loop;
      update public.player_attributes set ratings = out, updated_at = now() where player_id = r.id;
      select coalesce(avg((out->>key)::numeric - (old->>key)::numeric), 0) into power_gain
        from unnest(array['strength', 'anchor', 'power_moves', 'break_tackle', 'hit_power', 'run_block', 'run_stop']) key where old ? key;
      speed_gain := coalesce((out->>'speed')::numeric - (old->>'speed')::numeric, 0);
      dw := power_gain * 0.8 - speed_gain * 1.0 + (random() * 4 - 1);
    else dw := 0; end if;
    update public.players set stars = new_stars,
      weight_lb = least(coalesce(base_weight_lb, weight_lb) + 30, greatest(coalesce(base_weight_lb, weight_lb) - 30, weight_lb + round(dw)))
      where id = r.id;
    if new_stars - r.stars >= 1 then
      perform public.log_event('developed', r.id, r.team_id, format('%s made a big jump: %s to %s stars', r.name, r.stars, new_stars));
    end if;
    made := made + 1;
  end loop;
  return made;
end $$;

do $do$
declare d text;
begin
  -- 25: roughly 38% overall. Backups and free agents more, starters and stars less. Potential no longer protects him.
  d := pg_get_functiondef('public.regress_players()'::regprocedure);
  d := replace(d, 'when 25 then case when r.pot > r.stars then 0 when r.stars <= 3.5 then 0.35 when r.stars = 4 then 0.12 else 0 end',
    'when 25 then greatest(0.05, least(0.6, 0.27 + case when r.depth = ''starter'' then -0.10 else 0.12 end + case when r.stars <= 3 then 0.05 when r.stars >= 4.5 then -0.15 else 0 end))');
  if d not like '%0.27 + case when r.depth%' then raise exception 'regress patch failed'; end if;
  execute d;
  -- Regression rolls first, so a 25 year old who drops doesn't also grow.
  d := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
  d := replace(d, $x$    perform public.log_event('developed', null, null, format('%s young players improved this offseason', public.develop_players()));
    perform public.log_event('regressed', null, null, format('%s veterans slowed down this offseason', public.regress_players()));$x$,
  $x$    perform public.log_event('regressed', null, null, format('%s veterans slowed down this offseason', public.regress_players()));
    perform public.log_event('developed', null, null, format('%s young players went up a star (or to their potential) this offseason', public.develop_players()));$x$);
  if d not like '%went up a star%' then raise exception 'offseason order patch failed'; end if;
  execute d;
end $do$;

create table if not exists public.team_jerseys (
  team_id text not null references public.teams(id), slot smallint not null check (slot between 1 and 4),
  name text not null, colors jsonb not null, updated_at timestamptz not null default now(), primary key (team_id, slot));
alter table public.team_jerseys enable row level security;
drop policy if exists "anyone reads jerseys" on public.team_jerseys;
create policy "anyone reads jerseys" on public.team_jerseys for select using (true);

create table if not exists public.jersey_requests (
  id bigserial primary key, team_id text not null references public.teams(id), slot smallint not null check (slot between 1 and 4),
  name text not null, colors jsonb not null, status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(), decided_at timestamptz);
alter table public.jersey_requests enable row level security;
drop policy if exists "anyone reads jersey requests" on public.jersey_requests;
create policy "anyone reads jersey requests" on public.jersey_requests for select using (true);

insert into public.team_jerseys (team_id, slot, name, colors) values
('crf', 1, 'Home', '{"helmet": "#d00e0d", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#d00e0d", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#f1f3f5", "socks": "#d00e0d"}'::jsonb),
('crf', 2, 'Away', '{"helmet": "#d00e0d", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#f1f3f5", "numbers": "#d00e0d", "trim": "#d00e0d", "pants": "#d00e0d", "socks": "#d00e0d"}'::jsonb),
('crf', 3, 'Color Rush', '{"helmet": "#d00e0d", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#1f2024", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#1f2024", "socks": "#1f2024"}'::jsonb),
('crf', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#f1f3f5", "jersey": "#18191c", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('ddc', 1, 'Home', '{"helmet": "#0a3570", "mask": "#9aa0a8", "stripe": "#fae57d", "jersey": "#0a3570", "numbers": "#fae57d", "trim": "#fae57d", "pants": "#f1f3f5", "socks": "#0a3570"}'::jsonb),
('ddc', 2, 'Away', '{"helmet": "#0a3570", "mask": "#9aa0a8", "stripe": "#fae57d", "jersey": "#f1f3f5", "numbers": "#0a3570", "trim": "#0a3570", "pants": "#0a3570", "socks": "#0a3570"}'::jsonb),
('ddc', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#0a3570", "jersey": "#f1f3f5", "numbers": "#0a3570", "trim": "#0a3570", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('ddc', 4, 'Color Rush', '{"helmet": "#0a3570", "mask": "#9aa0a8", "stripe": "#0a3570", "jersey": "#fae57d", "numbers": "#0a3570", "trim": "#0a3570", "pants": "#0a3570", "socks": "#fae57d"}'::jsonb),
('drf', 1, 'Home', '{"helmet": "#126b16", "mask": "#9aa0a8", "stripe": "#5be056", "jersey": "#126b16", "numbers": "#5be056", "trim": "#5be056", "pants": "#f1f3f5", "socks": "#126b16"}'::jsonb),
('drf', 2, 'Away', '{"helmet": "#126b16", "mask": "#9aa0a8", "stripe": "#5be056", "jersey": "#f1f3f5", "numbers": "#126b16", "trim": "#126b16", "pants": "#126b16", "socks": "#126b16"}'::jsonb),
('drf', 3, 'Color Rush', '{"helmet": "#126b16", "mask": "#9aa0a8", "stripe": "#126b16", "jersey": "#5be056", "numbers": "#126b16", "trim": "#126b16", "pants": "#5be056", "socks": "#5be056"}'::jsonb),
('drf', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#5be056", "jersey": "#18191c", "numbers": "#5be056", "trim": "#5be056", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('dst', 1, 'Home', '{"helmet": "#7c4e0c", "mask": "#9aa0a8", "stripe": "#f2a91e", "jersey": "#7c4e0c", "numbers": "#f2a91e", "trim": "#f2a91e", "pants": "#f1f3f5", "socks": "#7c4e0c"}'::jsonb),
('dst', 2, 'Away', '{"helmet": "#7c4e0c", "mask": "#9aa0a8", "stripe": "#f2a91e", "jersey": "#f1f3f5", "numbers": "#7c4e0c", "trim": "#7c4e0c", "pants": "#7c4e0c", "socks": "#7c4e0c"}'::jsonb),
('dst', 3, 'Color Rush', '{"helmet": "#7c4e0c", "mask": "#9aa0a8", "stripe": "#7c4e0c", "jersey": "#f2a91e", "numbers": "#7c4e0c", "trim": "#7c4e0c", "pants": "#f2a91e", "socks": "#f2a91e"}'::jsonb),
('dst', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#f2a91e", "jersey": "#18191c", "numbers": "#f2a91e", "trim": "#f2a91e", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('edc', 1, 'Home', '{"helmet": "#5c1245", "mask": "#9aa0a8", "stripe": "#f2d64d", "jersey": "#5c1245", "numbers": "#f2d64d", "trim": "#f2d64d", "pants": "#f1f3f5", "socks": "#5c1245"}'::jsonb),
('edc', 2, 'Away', '{"helmet": "#5c1245", "mask": "#9aa0a8", "stripe": "#f2d64d", "jersey": "#f1f3f5", "numbers": "#5c1245", "trim": "#5c1245", "pants": "#5c1245", "socks": "#5c1245"}'::jsonb),
('edc', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#5c1245", "jersey": "#f1f3f5", "numbers": "#5c1245", "trim": "#5c1245", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('edc', 4, 'Color Rush', '{"helmet": "#5c1245", "mask": "#9aa0a8", "stripe": "#5c1245", "jersey": "#f2d64d", "numbers": "#5c1245", "trim": "#5c1245", "pants": "#5c1245", "socks": "#f2d64d"}'::jsonb),
('flf', 1, 'Home', '{"helmet": "#4c572c", "mask": "#9aa0a8", "stripe": "#dbc597", "jersey": "#4c572c", "numbers": "#dbc597", "trim": "#dbc597", "pants": "#f1f3f5", "socks": "#4c572c"}'::jsonb),
('flf', 2, 'Away', '{"helmet": "#4c572c", "mask": "#9aa0a8", "stripe": "#dbc597", "jersey": "#f1f3f5", "numbers": "#4c572c", "trim": "#4c572c", "pants": "#4c572c", "socks": "#4c572c"}'::jsonb),
('flf', 3, 'Color Rush', '{"helmet": "#4c572c", "mask": "#9aa0a8", "stripe": "#4c572c", "jersey": "#dbc597", "numbers": "#4c572c", "trim": "#4c572c", "pants": "#dbc597", "socks": "#dbc597"}'::jsonb),
('flf', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#dbc597", "jersey": "#18191c", "numbers": "#dbc597", "trim": "#dbc597", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('lsc', 1, 'Home', '{"helmet": "#c535ae", "mask": "#9aa0a8", "stripe": "#ffd1f6", "jersey": "#c535ae", "numbers": "#ffd1f6", "trim": "#ffd1f6", "pants": "#f1f3f5", "socks": "#c535ae"}'::jsonb),
('lsc', 2, 'Away', '{"helmet": "#c535ae", "mask": "#9aa0a8", "stripe": "#ffd1f6", "jersey": "#f1f3f5", "numbers": "#c535ae", "trim": "#c535ae", "pants": "#c535ae", "socks": "#c535ae"}'::jsonb),
('lsc', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#c535ae", "jersey": "#f1f3f5", "numbers": "#c535ae", "trim": "#c535ae", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('lsc', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#ffd1f6", "jersey": "#18191c", "numbers": "#ffd1f6", "trim": "#ffd1f6", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('ntw', 1, 'Home', '{"helmet": "#b51206", "mask": "#9aa0a8", "stripe": "#fcc015", "jersey": "#b51206", "numbers": "#fcc015", "trim": "#fcc015", "pants": "#f1f3f5", "socks": "#b51206"}'::jsonb),
('ntw', 2, 'Away', '{"helmet": "#b51206", "mask": "#9aa0a8", "stripe": "#fcc015", "jersey": "#f1f3f5", "numbers": "#b51206", "trim": "#b51206", "pants": "#b51206", "socks": "#b51206"}'::jsonb),
('ntw', 3, 'Color Rush', '{"helmet": "#b51206", "mask": "#9aa0a8", "stripe": "#b51206", "jersey": "#fcc015", "numbers": "#b51206", "trim": "#b51206", "pants": "#fcc015", "socks": "#fcc015"}'::jsonb),
('ntw', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#fcc015", "jersey": "#18191c", "numbers": "#fcc015", "trim": "#fcc015", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('ocm', 1, 'Home', '{"helmet": "#2f6a5e", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#2f6a5e", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#f1f3f5", "socks": "#2f6a5e"}'::jsonb),
('ocm', 2, 'Away', '{"helmet": "#2f6a5e", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#f1f3f5", "numbers": "#2f6a5e", "trim": "#2f6a5e", "pants": "#2f6a5e", "socks": "#2f6a5e"}'::jsonb),
('ocm', 3, 'Color Rush', '{"helmet": "#2f6a5e", "mask": "#9aa0a8", "stripe": "#18191c", "jersey": "#ef8a2b", "numbers": "#18191c", "trim": "#18191c", "pants": "#ef8a2b", "socks": "#ef8a2b"}'::jsonb),
('ocm', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#ef8a2b", "jersey": "#18191c", "numbers": "#ef8a2b", "trim": "#ef8a2b", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('ocn', 1, 'Home', '{"helmet": "#3d5064", "mask": "#9aa0a8", "stripe": "#c4d4e2", "jersey": "#3d5064", "numbers": "#c4d4e2", "trim": "#c4d4e2", "pants": "#f1f3f5", "socks": "#3d5064"}'::jsonb),
('ocn', 2, 'Away', '{"helmet": "#3d5064", "mask": "#9aa0a8", "stripe": "#c4d4e2", "jersey": "#f1f3f5", "numbers": "#3d5064", "trim": "#3d5064", "pants": "#3d5064", "socks": "#3d5064"}'::jsonb),
('ocn', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#3d5064", "jersey": "#f1f3f5", "numbers": "#3d5064", "trim": "#3d5064", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('ocn', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#c4d4e2", "jersey": "#18191c", "numbers": "#c4d4e2", "trim": "#c4d4e2", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('pln', 1, 'Home', '{"helmet": "#d9707a", "mask": "#9aa0a8", "stripe": "#5a1f24", "jersey": "#d9707a", "numbers": "#5a1f24", "trim": "#5a1f24", "pants": "#f1f3f5", "socks": "#d9707a"}'::jsonb),
('pln', 2, 'Away', '{"helmet": "#d9707a", "mask": "#9aa0a8", "stripe": "#5a1f24", "jersey": "#f1f3f5", "numbers": "#d9707a", "trim": "#d9707a", "pants": "#d9707a", "socks": "#d9707a"}'::jsonb),
('pln', 3, 'Color Rush', '{"helmet": "#d9707a", "mask": "#9aa0a8", "stripe": "#d9707a", "jersey": "#5a1f24", "numbers": "#d9707a", "trim": "#d9707a", "pants": "#5a1f24", "socks": "#5a1f24"}'::jsonb),
('pln', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#d9707a", "jersey": "#18191c", "numbers": "#d9707a", "trim": "#d9707a", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('snm', 1, 'Home', '{"helmet": "#1f9cc4", "mask": "#9aa0a8", "stripe": "#ffffff", "jersey": "#1f9cc4", "numbers": "#ffffff", "trim": "#ffffff", "pants": "#f1f3f5", "socks": "#1f9cc4"}'::jsonb),
('snm', 2, 'Away', '{"helmet": "#1f9cc4", "mask": "#9aa0a8", "stripe": "#ffffff", "jersey": "#f1f3f5", "numbers": "#1f9cc4", "trim": "#1f9cc4", "pants": "#1f9cc4", "socks": "#1f9cc4"}'::jsonb),
('snm', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#d9dde2", "stripe": "#1f9cc4", "jersey": "#f1f3f5", "numbers": "#1f9cc4", "trim": "#1f9cc4", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('snm', 4, 'Overdrive', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#1f9cc4", "jersey": "#18191c", "numbers": "#1f9cc4", "trim": "#1f9cc4", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('tga', 1, 'Home', '{"helmet": "#e06a06", "mask": "#9aa0a8", "stripe": "#fff1e4", "jersey": "#e06a06", "numbers": "#fff1e4", "trim": "#fff1e4", "pants": "#f1f3f5", "socks": "#e06a06"}'::jsonb),
('tga', 2, 'Away', '{"helmet": "#e06a06", "mask": "#9aa0a8", "stripe": "#fff1e4", "jersey": "#f1f3f5", "numbers": "#e06a06", "trim": "#e06a06", "pants": "#e06a06", "socks": "#e06a06"}'::jsonb),
('tga', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#e06a06", "jersey": "#f1f3f5", "numbers": "#e06a06", "trim": "#e06a06", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('tga', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#e06a06", "jersey": "#18191c", "numbers": "#e06a06", "trim": "#e06a06", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('void', 1, 'Home', '{"helmet": "#363f45", "mask": "#9aa0a8", "stripe": "#e6eaed", "jersey": "#363f45", "numbers": "#e6eaed", "trim": "#e6eaed", "pants": "#f1f3f5", "socks": "#363f45"}'::jsonb),
('void', 2, 'Away', '{"helmet": "#363f45", "mask": "#9aa0a8", "stripe": "#e6eaed", "jersey": "#f1f3f5", "numbers": "#363f45", "trim": "#363f45", "pants": "#363f45", "socks": "#363f45"}'::jsonb),
('void', 3, 'Whiteout', '{"helmet": "#f1f3f5", "mask": "#9aa0a8", "stripe": "#363f45", "jersey": "#f1f3f5", "numbers": "#363f45", "trim": "#363f45", "pants": "#f1f3f5", "socks": "#f1f3f5"}'::jsonb),
('void', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#e6eaed", "jersey": "#18191c", "numbers": "#e6eaed", "trim": "#e6eaed", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('wrf', 1, 'Home', '{"helmet": "#222126", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#222126", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#f1f3f5", "socks": "#222126"}'::jsonb),
('wrf', 2, 'Away', '{"helmet": "#222126", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#f1f3f5", "numbers": "#222126", "trim": "#222126", "pants": "#222126", "socks": "#222126"}'::jsonb),
('wrf', 3, 'Color Rush', '{"helmet": "#222126", "mask": "#9aa0a8", "stripe": "#f1f3f5", "jersey": "#9a4dff", "numbers": "#f1f3f5", "trim": "#f1f3f5", "pants": "#9a4dff", "socks": "#9a4dff"}'::jsonb),
('wrf', 4, 'Shadow', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#9a4dff", "jersey": "#18191c", "numbers": "#9a4dff", "trim": "#9a4dff", "pants": "#18191c", "socks": "#18191c"}'::jsonb),
('wsl', 1, 'Home', '{"helmet": "#065360", "mask": "#9aa0a8", "stripe": "#2ef4ff", "jersey": "#065360", "numbers": "#2ef4ff", "trim": "#2ef4ff", "pants": "#f1f3f5", "socks": "#065360"}'::jsonb),
('wsl', 2, 'Away', '{"helmet": "#065360", "mask": "#9aa0a8", "stripe": "#2ef4ff", "jersey": "#f1f3f5", "numbers": "#065360", "trim": "#065360", "pants": "#065360", "socks": "#065360"}'::jsonb),
('wsl', 3, 'Color Rush', '{"helmet": "#065360", "mask": "#9aa0a8", "stripe": "#065360", "jersey": "#2ef4ff", "numbers": "#065360", "trim": "#065360", "pants": "#2ef4ff", "socks": "#2ef4ff"}'::jsonb),
('wsl', 4, 'Blackout', '{"helmet": "#18191c", "mask": "#18191c", "stripe": "#2ef4ff", "jersey": "#18191c", "numbers": "#2ef4ff", "trim": "#2ef4ff", "pants": "#18191c", "socks": "#18191c"}'::jsonb)
on conflict (team_id, slot) do nothing;
update public.team_jerseys set colors = jsonb_set(colors, '{stripe}', colors->'jersey') where colors->>'stripe' = colors->>'helmet';

-- Checks a jersey: 8 hex colors, Home/Away keep their names, alternates get 1-20 characters. Returns the clean name.
create or replace function public.jersey_check(p_slot int, p_name text, p_colors jsonb) returns text
language plpgsql immutable set search_path to '' as $$
declare k text;
begin
  if p_slot not between 1 and 4 then raise exception 'Pick one of the four jerseys'; end if;
  foreach k in array array['helmet', 'mask', 'stripe', 'jersey', 'numbers', 'trim', 'pants', 'socks'] loop
    if coalesce(p_colors->>k, '') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Pick a color for the %', k; end if;
  end loop;
  if p_slot = 1 then return 'Home'; elsif p_slot = 2 then return 'Away'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 20 then raise exception 'Give the jersey a name (up to 20 letters)'; end if;
  if lower(trim(p_name)) in ('home', 'away') then raise exception 'Home and Away are taken. Pick another name.'; end if;
  return trim(p_name);
end $$;

create or replace function public.request_jersey_change(p_slot int, p_name text, p_colors jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); nm text; rid bigint; clean jsonb;
begin
  if me is null then raise exception 'Only a team''s coach can ask for that'; end if;
  nm := public.jersey_check(p_slot, p_name, p_colors);
  select jsonb_object_agg(k, lower(p_colors->>k)) into clean from unnest(array['helmet', 'mask', 'stripe', 'jersey', 'numbers', 'trim', 'pants', 'socks']) k;
  if exists (select 1 from public.team_jerseys where team_id = me and slot = p_slot and name = nm and colors = clean) then raise exception 'Nothing changed'; end if;
  update public.jersey_requests set status = 'denied', decided_at = now() where team_id = me and slot = p_slot and status = 'pending';
  insert into public.jersey_requests (team_id, slot, name, colors) values (me, p_slot, nm, clean) returning id into rid;
  perform public.notify(null, true, false, 'jersey_request', format('Jersey change: %s %s jersey', (select name from public.teams where id = me), nm),
    'Approve it to make it official, or deny it.', jsonb_build_object('request', rid, 'team', me, 'slot', p_slot, 'name', nm, 'colors', clean));
  return jsonb_build_object('request', rid);
end $$;

create or replace function public.decide_jersey_change(p_request bigint, p_approve boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare r public.jersey_requests;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.jersey_requests where id = p_request for update;
  if r.status is distinct from 'pending' then raise exception 'That request was already decided (or replaced by a newer one)'; end if;
  if p_approve then
    insert into public.team_jerseys (team_id, slot, name, colors, updated_at) values (r.team_id, r.slot, r.name, r.colors, now())
    on conflict (team_id, slot) do update set name = excluded.name, colors = excluded.colors, updated_at = now();
  end if;
  update public.jersey_requests set status = case when p_approve then 'approved' else 'denied' end, decided_at = now() where id = r.id;
  perform public.notify(r.team_id, false, false, 'jersey_' || case when p_approve then 'approved' else 'denied' end,
    format('Your %s jersey change was %s', r.name, case when p_approve then 'approved' else 'denied' end),
    case when p_approve then 'It''s official. That''s what you wear now.' else 'The commissioner said no. You can send a new version.' end, jsonb_build_object('slot', r.slot));
  return jsonb_build_object('approved', p_approve);
end $$;

create or replace function public.commish_set_jersey(p_team text, p_slot int, p_name text, p_colors jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare nm text; clean jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  nm := public.jersey_check(p_slot, p_name, p_colors);
  select jsonb_object_agg(k, lower(p_colors->>k)) into clean from unnest(array['helmet', 'mask', 'stripe', 'jersey', 'numbers', 'trim', 'pants', 'socks']) k;
  insert into public.team_jerseys (team_id, slot, name, colors, updated_at) values (p_team, p_slot, nm, clean, now())
  on conflict (team_id, slot) do update set name = excluded.name, colors = excluded.colors, updated_at = now();
  update public.jersey_requests set status = 'denied', decided_at = now() where team_id = p_team and slot = p_slot and status = 'pending';
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.request_jersey_change(int, text, jsonb), public.decide_jersey_change(bigint, boolean), public.commish_set_jersey(text, int, text, jsonb) to authenticated;
