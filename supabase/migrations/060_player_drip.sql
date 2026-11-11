-- 060: Player drip (part 1). What each player wears with his uniform: helmet model (Axiom, SpeedFlex, F7, Vicis Zero2),
-- undershirt, arm sleeves, gloves, QB play sheet, pants length, compression shorts, leg sleeves. Colors are team tokens
-- (jersey, trim, numbers) or white/black, so drip follows whichever uniform he's wearing. Plus each team's helmet design.
-- Coach requests with the 2-week rule come in part 2; the commissioner can set drip directly now.

alter table public.teams add column if not exists helmet_design text not null default 'stripe'
  check (helmet_design in ('stripe', 'double', 'plain', 'logo', 'logo_stripe'));
update public.teams t set helmet_design = x.d from (values
  ('crf', 'logo'), ('ddc', 'logo_stripe'), ('drf', 'logo'), ('dst', 'stripe'), ('edc', 'logo'), ('flf', 'plain'), ('lsc', 'logo'), ('ntw', 'logo'),
  ('ocm', 'double'), ('ocn', 'logo_stripe'), ('pln', 'logo'), ('snm', 'logo_stripe'), ('tga', 'logo'), ('void', 'logo'), ('wrf', 'logo'), ('wsl', 'double')) x(id, d)
where t.id = x.id;

create table if not exists public.player_drip (
  player_id text primary key references public.players(id) on delete cascade,
  drip jsonb not null, updated_at timestamptz not null default now());
alter table public.player_drip enable row level security;
drop policy if exists "anyone reads drip" on public.player_drip;
create policy "anyone reads drip" on public.player_drip for select using (true);

-- Checks a drip and returns it cleaned (unknown keys dropped).
create or replace function public.drip_check(d jsonb, p_position text) returns jsonb
language plpgsql immutable set search_path to '' as $$
declare k text; c text;
begin
  if coalesce(d->>'helmet', '') not in ('axiom', 'speedflex', 'f7', 'vicis') then raise exception 'Pick a helmet'; end if;
  if coalesce(d->>'undershirt', 'none') not in ('none', 'short', 'long') then raise exception 'Bad undershirt'; end if;
  if coalesce(d->>'sleeves', 'none') not in ('none', 'left', 'right', 'both') then raise exception 'Bad arm sleeves'; end if;
  if coalesce(d->>'sleeveStyle', 'solid') not in ('solid', 'stripe', 'two_tone') then raise exception 'Bad sleeve style'; end if;
  if coalesce(d->>'gloves', 'none') not in ('none', 'left', 'right', 'both') then raise exception 'Bad gloves'; end if;
  if coalesce(d->>'legSleeves', 'none') not in ('none', 'left', 'right', 'both') then raise exception 'Bad leg sleeves'; end if;
  if coalesce(d->>'pants', 'classic') not in ('classic', 'short') then raise exception 'Bad pants'; end if;
  foreach k in array array['undershirtColor', 'sleeveColor', 'sleeveColor2', 'gloveColor', 'legColor', 'compression'] loop
    c := d->>k;
    if c is not null and c not in ('none', 'jersey', 'trim', 'numbers', 'white', 'black') and c !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Bad color for %', k; end if;
  end loop;
  if coalesce((d->>'playsheet')::boolean, false) and p_position <> 'QB' then raise exception 'Only quarterbacks wear a play sheet'; end if;
  return jsonb_strip_nulls(jsonb_build_object('helmet', d->>'helmet', 'undershirt', coalesce(d->>'undershirt', 'none'), 'undershirtColor', d->>'undershirtColor',
    'sleeves', coalesce(d->>'sleeves', 'none'), 'sleeveStyle', coalesce(d->>'sleeveStyle', 'solid'), 'sleeveColor', d->>'sleeveColor', 'sleeveColor2', d->>'sleeveColor2',
    'gloves', coalesce(d->>'gloves', 'none'), 'gloveColor', d->>'gloveColor', 'playsheet', coalesce((d->>'playsheet')::boolean, false),
    'pants', coalesce(d->>'pants', 'classic'), 'compression', coalesce(d->>'compression', 'none'), 'legSleeves', coalesce(d->>'legSleeves', 'none'), 'legColor', d->>'legColor'));
end $$;

create or replace function public.commish_set_drip(p_player text, p_drip jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare pos text; clean jsonb;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select position into pos from public.players where id = p_player;
  if pos is null then raise exception 'No such player'; end if;
  clean := public.drip_check(p_drip, pos);
  insert into public.player_drip (player_id, drip, updated_at) values (p_player, clean, now())
  on conflict (player_id) do update set drip = excluded.drip, updated_at = now();
  return clean;
end $$;

create or replace function public.commish_set_helmet_design(p_team text, p_design text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  update public.teams set helmet_design = p_design where id = p_team;
  return jsonb_build_object('ok', true);
end $$;

-- Starting drip for everyone, seeded from the player id so it never reshuffles.
-- Helmets: field general QBs wear the Vicis, most running backs the Axiom, everyone else a mix. Bojan: SpeedFlex. Garry Drake: F7.
insert into public.player_drip (player_id, drip)
select p.id, jsonb_strip_nulls(jsonb_build_object(
  'helmet', case when p.name = 'Bojan Kovacic' then 'speedflex' when p.id = 'snm-03' or p.name = 'Garry Drake' then 'f7'
    when p.position = 'QB' and a.style = 'field_general' then 'vicis'
    when p.position = 'QB' then (array['vicis', 'speedflex', 'speedflex', 'f7'])[1 + r.r1 % 4]
    when p.position = 'RB' then (array['axiom', 'axiom', 'axiom', 'axiom', 'axiom', 'axiom', 'axiom', 'speedflex', 'f7', 'speedflex'])[1 + r.r1 % 10]
    when p.position in ('OT', 'OG', 'C', 'DL', 'DT') then (array['f7', 'f7', 'speedflex', 'speedflex', 'axiom'])[1 + r.r1 % 5]
    else (array['speedflex', 'speedflex', 'speedflex', 'f7', 'f7', 'axiom', 'axiom', 'vicis'])[1 + r.r1 % 8] end,
  'undershirt', (array['none', 'none', 'none', 'none', 'short', 'short', 'short', 'long'])[1 + r.r2 % 8],
  'undershirtColor', (array['black', 'white', 'jersey', 'black'])[1 + r.r3 % 4],
  'sleeves', case when p.position in ('OT', 'OG', 'C') then 'none' else (array['none', 'none', 'none', 'none', 'none', 'both', 'left', 'right'])[1 + r.r4 % 8] end,
  'sleeveStyle', (array['solid', 'solid', 'stripe', 'two_tone'])[1 + r.r5 % 4],
  'sleeveColor', (array['black', 'white', 'trim', 'jersey'])[1 + r.r6 % 4], 'sleeveColor2', (array['white', 'trim', 'black'])[1 + r.r7 % 3],
  'gloves', case when p.position in ('OT', 'OG', 'C', 'DL', 'DT', 'DE') then 'both' when p.position = 'QB' then (array['none', 'left', 'right'])[1 + r.r8 % 3]
    else (array['both', 'both', 'both', 'both', 'none'])[1 + r.r8 % 5] end,
  'gloveColor', case when p.position in ('OT', 'OG', 'C', 'DL', 'DT') then 'black' else (array['trim', 'white', 'black', 'jersey'])[1 + r.r9 % 4] end,
  'playsheet', p.position = 'QB' and r.r9 % 5 <> 0,
  'pants', case when p.position in ('WR', 'CB', 'RB', 'SS') then (array['classic', 'short', 'short'])[1 + r.r2 % 3] else 'classic' end,
  'compression', (array['none', 'black', 'white', 'trim'])[1 + r.r3 % 4],
  'legSleeves', (array['none', 'none', 'both', 'left', 'right'])[1 + r.r5 % 5], 'legColor', (array['black', 'white', 'trim'])[1 + r.r6 % 3]))
from public.players p
left join public.player_attributes a on a.player_id = p.id
cross join lateral (select ('x' || substr(md5(p.id || 'drip'), 1, 8))::bit(32)::bigint & 2147483647 as h) hh
cross join lateral (select hh.h % 97 r1, (hh.h / 7) % 89 r2, (hh.h / 13) % 83 r3, (hh.h / 17) % 79 r4, (hh.h / 19) % 73 r5,
  (hh.h / 23) % 71 r6, (hh.h / 29) % 67 r7, (hh.h / 31) % 61 r8, (hh.h / 37) % 59 r9) r
where p.status in ('active', 'free_agent', 'prospect')
on conflict (player_id) do nothing;

grant execute on function public.commish_set_drip(text, jsonb), public.commish_set_helmet_design(text, text) to authenticated;
