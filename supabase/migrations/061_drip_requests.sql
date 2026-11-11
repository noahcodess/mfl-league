-- 061: Drip part 2. The Vicis helmet is retired (three helmets now). Coaches request drip changes, numbers included:
-- one customization per request, and one approved change per player every 2 league periods (a period = a game week or an
-- offseason step). The commissioner sees before and after and accepts or declines; the coach hears back in the inbox.

update public.player_drip set drip = jsonb_set(drip, '{helmet}', '"speedflex"') where drip->>'helmet' = 'vicis';
alter table public.player_drip add column if not exists changed_clock int;

insert into public.league_settings (key, value) values ('league_clock', '0'), ('drip_cooldown', '2') on conflict (key) do nothing;

create table if not exists public.drip_requests (
  id bigserial primary key, player_id text not null references public.players(id) on delete cascade, team_id text not null references public.teams(id),
  item text not null, before jsonb not null, after jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(), decided_at timestamptz);
create unique index if not exists drip_requests_one_pending on public.drip_requests (player_id) where status = 'pending';
alter table public.drip_requests enable row level security;
drop policy if exists "anyone reads drip requests" on public.drip_requests;
create policy "anyone reads drip requests" on public.drip_requests for select using (true);

do $do$
declare d text;
begin
  d := pg_get_functiondef('public.drip_check(jsonb, text)'::regprocedure);
  d := replace(d, $x$not in ('axiom', 'speedflex', 'f7', 'vicis')$x$, $x$not in ('axiom', 'speedflex', 'f7')$x$);
  if d like '%vicis%' then raise exception 'drip_check patch failed'; end if;
  execute d;
  -- the league clock ticks once per game week and once per offseason step
  d := pg_get_functiondef('public.advance_week()'::regprocedure);
  d := replace(d, $x$  cut := public.trade_request_deadline();$x$, $x$  update public.league_settings set value = to_jsonb(coalesce(public.setting_int('league_clock'), 0) + 1) where key = 'league_clock';
  cut := public.trade_request_deadline();$x$);
  if d not like '%league_clock%' then raise exception 'advance_week patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
  d := replace(d, $x$  perform public.refresh_morale(step in (2, 4));$x$, $x$  perform public.refresh_morale(step in (2, 4));
  update public.league_settings set value = to_jsonb(coalesce(public.setting_int('league_clock'), 0) + 1) where key = 'league_clock';$x$);
  if d not like '%league_clock%' then raise exception 'offseason patch failed'; end if;
  execute d;
  d := pg_get_functiondef('public.set_league_number(text, integer)'::regprocedure);
  d := replace(d, $x$('trade_request_angry_pct', 0, 100),$x$, $x$('trade_request_angry_pct', 0, 100), ('drip_cooldown', 0, 12),$x$);
  execute d;
end $do$;

-- Which customization groups differ between two drips (plus the number).
create or replace function public.drip_changes(a jsonb, b jsonb, n1 int, n2 int) returns text[]
language sql immutable set search_path to '' as $$
  select coalesce(array_agg(g order by g), '{}') from (
    select g from (values ('Helmet', array['helmet']), ('Undershirt', array['undershirt', 'undershirtColor']),
      ('Arm sleeves', array['sleeves', 'sleeveStyle', 'sleeveColor', 'sleeveColor2']), ('Gloves', array['gloves', 'gloveColor']),
      ('Play sheet', array['playsheet']), ('Pants', array['pants']), ('Compression shorts', array['compression']),
      ('Leg sleeves', array['legSleeves', 'legColor'])) x(g, ks)
    where exists (select 1 from unnest(x.ks) k where (a->k) is distinct from (b->k))
    union all select 'Number' where n1 is distinct from n2) z
$$;

-- When a player can change again: { ready, left (periods to wait), pending }.
create or replace function public.drip_cooldown(p_player text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'pending', exists (select 1 from public.drip_requests r where r.player_id = p_player and r.status = 'pending'),
    'left', greatest(0, coalesce((select d.changed_clock from public.player_drip d where d.player_id = p_player), -99)
      + coalesce(public.setting_int('drip_cooldown'), 2) - coalesce(public.setting_int('league_clock'), 0)))
$$;

create or replace function public.request_drip_change(p_player text, p_drip jsonb, p_number int) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); pl public.players; cur jsonb; clean jsonb; ch text[]; cd jsonb; rid bigint;
begin
  select * into pl from public.players where id = p_player;
  if me is null or pl.team_id is distinct from me then raise exception 'Only his coach can ask for that'; end if;
  select drip into cur from public.player_drip where player_id = p_player;
  clean := public.drip_check(p_drip, pl.position);
  cur := coalesce(cur, clean);
  if p_number is null or p_number < 0 or p_number > 99 then raise exception 'Pick a number from 0 to 99'; end if;
  ch := public.drip_changes(cur, clean, pl.number, p_number);
  if cardinality(ch) = 0 then raise exception 'Nothing changed'; end if;
  if cardinality(ch) > 1 then raise exception 'One change at a time. You changed: %', array_to_string(ch, ', '); end if;
  cd := public.drip_cooldown(p_player);
  if (cd->>'pending')::boolean then raise exception 'There''s already a request waiting for him'; end if;
  if (cd->>'left')::int > 0 then raise exception '% can change again in % more week(s) or offseason step(s)', pl.name, cd->>'left'; end if;
  if p_number <> coalesce(pl.number, -1) and exists (select 1 from public.players where team_id = me and status = 'active' and number = p_number) then
    raise exception 'Someone on your team already wears %', p_number; end if;
  insert into public.drip_requests (player_id, team_id, item, before, after)
  values (p_player, me, ch[1], jsonb_build_object('drip', cur, 'number', pl.number), jsonb_build_object('drip', clean, 'number', p_number)) returning id into rid;
  perform public.notify(null, true, false, 'drip_request', format('Drip change: %s %s (%s)', pl.position, pl.name, ch[1]),
    format('The %s want to change his %s.', (select name from public.teams where id = me), lower(ch[1])),
    jsonb_build_object('request', rid, 'team', me, 'player', p_player, 'item', ch[1],
      'before', jsonb_build_object('drip', cur, 'number', pl.number), 'after', jsonb_build_object('drip', clean, 'number', p_number)));
  return jsonb_build_object('request', rid, 'item', ch[1]);
end $$;

create or replace function public.decide_drip_change(p_request bigint, p_approve boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare r public.drip_requests; nm text; n int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.drip_requests where id = p_request for update;
  if r.status is distinct from 'pending' then raise exception 'That request was already decided'; end if;
  select name into nm from public.players where id = r.player_id;
  if p_approve then
    n := (r.after->>'number')::int;
    if n is not null and exists (select 1 from public.players where team_id = r.team_id and status = 'active' and number = n and id <> r.player_id) then
      raise exception 'Someone on that team already wears %', n; end if;
    insert into public.player_drip (player_id, drip, changed_clock, updated_at) values (r.player_id, r.after->'drip', public.setting_int('league_clock'), now())
    on conflict (player_id) do update set drip = excluded.drip, changed_clock = excluded.changed_clock, updated_at = now();
    if n is not null then update public.players set number = n where id = r.player_id; end if;
  end if;
  update public.drip_requests set status = case when p_approve then 'approved' else 'denied' end, decided_at = now() where id = r.id;
  perform public.notify(r.team_id, false, false, 'drip_' || case when p_approve then 'approved' else 'denied' end,
    format('%s''s %s change was %s', nm, lower(r.item), case when p_approve then 'accepted' else 'declined' end),
    case when p_approve then format('It''s on. He can change again in %s weeks (or offseason steps).', coalesce(public.setting_int('drip_cooldown'), 2))
      else 'The commissioner said no. You can send a different change.' end, jsonb_build_object('player', r.player_id));
  return jsonb_build_object('approved', p_approve);
end $$;

grant execute on function public.drip_cooldown(text) to anon, authenticated;
grant execute on function public.request_drip_change(text, jsonb, int), public.decide_drip_change(bigint, boolean) to authenticated;
