-- 053: commissioner editing power (teams, logos, players, contracts) and regression (from age 25, red stars).

-- Team logos: a public bucket only the commissioner can write to; teams.logo_url overrides the built-in logo.
alter table public.teams add column if not exists logo_url text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 2097152, array['image/png']) on conflict (id) do nothing;
drop policy if exists team_logos_read on storage.objects;
create policy team_logos_read on storage.objects for select using (bucket_id = 'team-logos');
drop policy if exists team_logos_write on storage.objects;
create policy team_logos_write on storage.objects for insert to authenticated with check (bucket_id = 'team-logos' and public.is_commissioner());
drop policy if exists team_logos_update on storage.objects;
create policy team_logos_update on storage.objects for update to authenticated using (bucket_id = 'team-logos' and public.is_commissioner());
drop policy if exists team_logos_delete on storage.objects;
create policy team_logos_delete on storage.objects for delete to authenticated using (bucket_id = 'team-logos' and public.is_commissioner());

create or replace function public.set_team_logo(p_team text, p_url text) returns void
language plpgsql volatile security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_url is not null and p_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/team-logos/' then raise exception 'Upload the logo first'; end if;
  update public.teams set logo_url = p_url where id = p_team;
  if not found then raise exception 'No such team'; end if;
  perform public.log_event('team_edit', null, p_team, format('The %s %s', (select name from public.teams where id = p_team), case when p_url is null then 'went back to their original logo' else 'have a new logo' end));
end $$;

-- Team details. A new abbreviation also renames the team's draft picks (they're keyed by abbreviation).
create or replace function public.commish_update_team(p_team text, p_name text, p_code text, p_conference text, p_color text, p_accent text) returns void
language plpgsql volatile security definer set search_path to '' as $$
declare t public.teams; nm text := trim(coalesce(p_name, '')); cd text := upper(trim(coalesce(p_code, '')));
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into t from public.teams where id = p_team;
  if t.id is null then raise exception 'No such team'; end if;
  if length(nm) < 3 or length(nm) > 40 then raise exception 'Team name must be 3 to 40 characters'; end if;
  if cd !~ '^[A-Z]{2,4}$' then raise exception 'Abbreviation must be 2 to 4 letters'; end if;
  if exists (select 1 from public.teams where upper(code) = cd and id <> p_team) then raise exception 'Another team already uses %', cd; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' or p_accent !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Colors must look like #1a2b3c'; end if;
  if p_conference not in (select distinct conference from public.teams) then raise exception 'Pick a conference'; end if;
  if upper(t.code) <> cd then update public.picks set original_code = cd where upper(original_code) = upper(t.code); end if;
  update public.teams set name = nm, code = cd, conference = p_conference, color = lower(p_color), accent = lower(p_accent) where id = p_team;
  if nm <> t.name or cd <> upper(t.code) then
    perform public.log_event('team_edit', null, p_team, format('The %s (%s) are now the %s (%s)', t.name, upper(t.code), nm, cd));
    perform public.notify(null, false, true, 'team_edit', format('The %s are now the %s', t.name, nm), format('New abbreviation: %s.', cd), jsonb_build_object('team', p_team));
  end if;
end $$;

-- Peak stars: the best he's ever been. Regression shows the gap in red.
alter table public.players add column if not exists peak_stars numeric, add column if not exists last_drop numeric not null default 0,
  add column if not exists last_drop_season int;
update public.players set peak_stars = stars where peak_stars is null;
create or replace function public.trg_peak_stars() returns trigger
language plpgsql set search_path to '' as $$
begin
  if tg_op = 'INSERT' then new.peak_stars := greatest(coalesce(new.peak_stars, new.stars), new.stars);
  elsif new.peak_stars is not distinct from old.peak_stars then new.peak_stars := greatest(coalesce(old.peak_stars, new.stars), new.stars);
  end if;
  return new;
end $$;
drop trigger if exists players_peak_stars on public.players;
create trigger players_peak_stars before insert or update of stars, peak_stars on public.players for each row execute function public.trg_peak_stars();

-- Edit any player. p is a json object with any of: name, number, position, age, stars, potential, height_in, weight_lb,
-- depth, team (team id, or "" for free agency), per_year, years_left. Setting stars resets his peak (a correction, not regression).
create or replace function public.commish_update_player(p_player text, p jsonb) returns jsonb
language plpgsql volatile security definer set search_path to '' as $$
declare pl public.players; newteam text; cs int := public.setting_int('current_season'); c public.contracts; v numeric; changes text[] := '{}';
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into pl from public.players where id = p_player;
  if pl.id is null then raise exception 'No such player'; end if;
  if p ? 'name' then
    if length(trim(p->>'name')) < 3 then raise exception 'Name is too short'; end if;
    update public.players set name = trim(p->>'name') where id = pl.id; changes := array_append(changes, 'name'::text); end if;
  if p ? 'position' then
    if not exists (select 1 from public.roster_template where position = p->>'position') then raise exception 'Unknown position'; end if;
    update public.players set position = p->>'position' where id = pl.id; changes := array_append(changes, 'position'::text); end if;
  if p ? 'age' then
    if (p->>'age')::int not between 18 and 40 then raise exception 'Age must be 18 to 40'; end if;
    update public.players set age = (p->>'age')::int where id = pl.id; changes := array_append(changes, 'age'::text); end if;
  if p ? 'stars' then
    v := (p->>'stars')::numeric;
    if v < 0.5 or v > 5 or v * 2 <> floor(v * 2) then raise exception 'Stars go from 0.5 to 5 in halves'; end if;
    update public.players set stars = v, peak_stars = v, last_drop = 0 where id = pl.id; changes := array_append(changes, 'stars'::text);
    update public.player_potential set potential = greatest(potential, v) where player_id = pl.id; end if;
  if p ? 'potential' then
    v := (p->>'potential')::numeric;
    if v < 0.5 or v > 5 or v * 2 <> floor(v * 2) then raise exception 'Potential goes from 0.5 to 5 in halves'; end if;
    insert into public.player_potential (player_id, potential) values (pl.id, greatest(v, (select stars from public.players where id = pl.id)))
      on conflict (player_id) do update set potential = excluded.potential; changes := array_append(changes, 'potential'::text); end if;
  if p ? 'height_in' then update public.players set height_in = (p->>'height_in')::int where id = pl.id; changes := array_append(changes, 'height'::text); end if;
  if p ? 'weight_lb' then update public.players set weight_lb = (p->>'weight_lb')::int, base_weight_lb = (p->>'weight_lb')::int where id = pl.id; changes := array_append(changes, 'weight'::text); end if;
  if p ? 'team' and coalesce(nullif(p->>'team', ''), '-') is distinct from coalesce(pl.team_id, '-') then
    newteam := nullif(p->>'team', '');
    if newteam is not null and not exists (select 1 from public.teams where id = newteam) then raise exception 'No such team'; end if;
    if newteam is null then
      update public.contracts set status = 'released' where player_id = pl.id and status = 'active';
      update public.players set status = 'free_agent', previous_team_id = pl.team_id, left_how = 'released', left_season = cs, team_id = null, number = null, depth = null, slot = null where id = pl.id;
    else
      update public.contracts set team_id = newteam where player_id = pl.id and status = 'active';
      update public.players set previous_team_id = pl.team_id where id = pl.id and pl.team_id is not null;
      perform public.join_team(pl.id, newteam);
      insert into public.player_moves (player_id, from_team, to_team, kind, season, note) values (pl.id, pl.team_id, newteam, 'commissioner', cs, 'Moved by the commissioner');
    end if;
    changes := array_append(changes, 'team'::text);
  end if;
  if p ? 'number' then
    select * into pl from public.players where id = p_player;
    if (p->>'number')::int not between 0 and 99 then raise exception 'Numbers go from 0 to 99'; end if;
    if exists (select 1 from public.players where team_id = pl.team_id and status = 'active' and number = (p->>'number')::int and id <> pl.id) then raise exception 'Someone on that team already wears #%', p->>'number'; end if;
    update public.players set number = (p->>'number')::int where id = pl.id; changes := array_append(changes, 'number'::text); end if;
  if p ? 'per_year' or p ? 'years_left' then
    select * into pl from public.players where id = p_player;
    if pl.team_id is null then raise exception 'Free agents have no contract to edit'; end if;
    select * into c from public.contracts where player_id = pl.id and status = 'active' limit 1;
    if c.id is null then
      insert into public.contracts (player_id, team_id, first_season, last_season, per_year, total, source, role)
      values (pl.id, pl.team_id, cs, cs + coalesce((p->>'years_left')::int, 1) - 1, coalesce((p->>'per_year')::int, 50000),
              coalesce((p->>'per_year')::int, 50000) * coalesce((p->>'years_left')::int, 1), 'commissioner', coalesce(pl.depth, 'backup'));
    else
      update public.contracts set per_year = coalesce((p->>'per_year')::int, per_year),
        last_season = case when p ? 'years_left' then cs + (p->>'years_left')::int - 1 else last_season end where id = c.id;
      update public.contracts set total = per_year * (last_season - first_season + 1) where id = c.id;
    end if;
    changes := array_append(changes, 'contract'::text); end if;
  select * into pl from public.players where id = p_player;
  if p ? 'depth' and pl.team_id is not null then
    update public.players set depth = p->>'depth' where id = pl.id;
    update public.contracts set role = p->>'depth' where player_id = pl.id and status = 'active'; changes := array_append(changes, 'depth'::text); end if;
  if pl.team_id is not null then perform public.place_depth(pl.team_id, pl.position); end if;
  if p ? 'team' and (select team_id from public.players where id = p_player) is distinct from (select previous_team_id from public.players where id = p_player)
     and (select previous_team_id from public.players where id = p_player) is not null then
    perform public.place_depth((select previous_team_id from public.players where id = p_player), pl.position); end if;
  perform public.log_event('player_edit', pl.id, pl.team_id, format('The commissioner updated %s (%s)', pl.name, array_to_string(changes, ', ')));
  return jsonb_build_object('changed', to_jsonb(changes));
end $$;

-- Regression. After birthdays: some 25s who are done growing and not great slip; most 26s slip; every 27 slips.
-- Never more than 2 stars below his peak. Ratings drop with the stars (speed hit hardest), and potential drops so he can't regrow.
create or replace function public.regress_players() returns int
language plpgsql volatile security definer set search_path to '' as $$
declare r record; d numeric; chance numeric; made int := 0; cs int := public.setting_int('current_season'); old jsonb; out jsonb; k text; v int;
begin
  for r in select p.*, coalesce(pp.potential, p.stars) pot from public.players p left join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and p.age between 25 and 27 and p.stars is not null loop
    chance := case r.age
      when 25 then case when r.pot > r.stars then 0 when r.stars <= 3.5 then 0.35 when r.stars = 4 then 0.12 else 0 end
      when 26 then case when r.stars >= 4.5 then 0.72 else 0.85 end
      else 1 end;
    continue when random() >= chance;
    d := case r.age when 25 then 0.5 when 26 then (case when random() < 0.7 then 0.5 else 1 end)
         else (case when random() < 0.5 then 0.5 when random() < 0.8 then 1 else 1.5 end) end;
    d := least(d, r.stars - greatest(coalesce(r.peak_stars, r.stars) - 2, 1));
    continue when d <= 0;
    update public.players set stars = stars - d, last_drop = d, last_drop_season = cs where id = r.id;
    update public.player_potential set potential = least(potential, r.stars - d) where player_id = r.id;
    select ratings into old from public.player_attributes where player_id = r.id;
    if old is not null then
      out := '{}';
      for k, v in select key, value::int from jsonb_each_text(old) loop
        out := out || jsonb_build_object(k, greatest(25, v - round(d * 6 + random() * 3 + case when k in ('speed', 'acceleration', 'agility') then 2 else 0 end)::int));
      end loop;
      update public.player_attributes set ratings = out, updated_at = now() where player_id = r.id;
    end if;
    if d >= 1 then perform public.log_event('regressed', r.id, r.team_id, format('%s slowed down: %s to %s stars', r.name, r.stars, r.stars - d)); end if;
    made := made + 1;
  end loop;
  return made;
end $$;

-- Wire regression into Birthday & Farewell (after growth, before retirements). A 26 who just dropped a full star or more
-- on a small contract is twice as likely to retire early.
do $do$
declare d text := pg_get_functiondef('public.advance_offseason_core()'::regprocedure);
begin
  d := replace(d, '    perform public.log_event(''developed'', null, null, format(''%s young players improved this offseason'', public.develop_players()));',
    '    perform public.log_event(''developed'', null, null, format(''%s young players improved this offseason'', public.develop_players()));
    perform public.log_event(''regressed'', null, null, format(''%s veterans slowed down this offseason'', public.regress_players()));');
  d := replace(d, '''retire_chance_27''), 0.2) * case when stars >= 4.5 then 0.6 when stars <= 3 then 1.3 else 1 end)',
    '''retire_chance_27''), 0.2) * case when stars >= 4.5 then 0.6 when stars <= 3 then 1.3 else 1 end
           * case when last_drop_season = season and last_drop >= 1 and coalesce((select c.per_year from public.contracts c where c.player_id = players.id and c.status = ''active'' limit 1), 0) < 100000 then 2 else 1 end)');
  if d not like '%regress_players%' or d not like '%last_drop >= 1%' then raise exception 'offseason patch failed'; end if;
  execute d;
end $do$;
