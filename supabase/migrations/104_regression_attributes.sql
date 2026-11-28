-- 104: a regressing veteran loses ratings that add up to the stars he lost. A star is worth 13 rating points on average
-- (rating_target = 28 + 13 x stars), so losing d stars takes 13 x d x (number of bars) points in total. Speed and
-- toughness almost always take a big share, plus 3-5 other bars at random (it's never only speed and toughness); one bar
-- loses at most 20 x d + 4 and none goes under 25 (what a bar can't take moves to another bar). peaks keeps each bar's best value, so the site can show what
-- he lost in red, like the stars.

alter table public.player_attributes add column if not exists peaks jsonb;

create or replace function public.regress_ratings(p_id text, d numeric) returns void language plpgsql security definer set search_path to '' as $function$
declare old jsonb; pk jsonb; w jsonb := '{}'; out jsonb; k text; v int; n int; total int; wsum numeric; dk int; left_ int; guard int := 0; cap int := round(20 * d) + 4;
begin
  select ratings, coalesce(peaks, '{}') into old, pk from public.player_attributes where player_id = p_id;
  if old is null or d <= 0 then return; end if;
  n := (select count(*) from jsonb_object_keys(old));
  total := round(13 * d * n);
  if old ? 'speed' and random() < 0.95 then w := w || jsonb_build_object('speed', 2.4 + random()); end if;
  if old ? 'toughness' and random() < 0.9 then w := w || jsonb_build_object('toughness', 1.8 + random()); end if;
  for k in select x from jsonb_object_keys(old) x where x not in ('speed', 'toughness') order by random() limit 3 + floor(random() * 3)::int loop
    w := w || jsonb_build_object(k, 0.6 + random());
  end loop;
  select sum(value::numeric) into wsum from jsonb_each_text(w);
  out := old; left_ := total;
  for k in select key from jsonb_each_text(w) loop
    v := (old->>k)::int;
    dk := least(greatest(0, v - 25), round(total * (w->>k)::numeric / wsum)::int, left_, cap);
    if dk > 0 then
      out := out || jsonb_build_object(k, v - dk);
      pk := pk || jsonb_build_object(k, greatest(coalesce((pk->>k)::int, v), v));
      left_ := left_ - dk;
    end if;
  end loop;
  while left_ > 0 and guard < 80 loop   -- a bar hit the floor: the rest comes off the others, a bit at a time
    guard := guard + 1;
    select x.key, x.value::int into k, v from jsonb_each_text(out) x where x.value::int > 25 and (old->>x.key)::int - x.value::int < cap order by (w ? x.key) desc, random() limit 1;
    exit when k is null;
    dk := least(left_, v - 25, 3, cap - ((old->>k)::int - v));
    out := out || jsonb_build_object(k, v - dk);
    pk := pk || jsonb_build_object(k, greatest(coalesce((pk->>k)::int, (old->>k)::int), (old->>k)::int));
    left_ := left_ - dk;
  end loop;
  update public.player_attributes set ratings = out, peaks = pk, updated_at = now() where player_id = p_id;
end $function$;

create or replace function public.regress_players() returns integer language plpgsql security definer set search_path to '' as $function$
declare r record; d numeric; chance numeric; made int := 0; cs int := public.setting_int('current_season');
begin
  if cs < coalesce(public.setting_int('regression_from_season'), 8) then return 0; end if;
  for r in select p.*, coalesce(pp.potential, p.stars) pot from public.players p left join public.player_potential pp on pp.player_id = p.id
           where p.status in ('active', 'free_agent') and p.age between 25 and 27 and p.stars is not null loop
    chance := case r.age
      when 25 then greatest(0.05, least(0.6, 0.27 + case when r.depth = 'starter' then -0.10 else 0.12 end + case when r.stars <= 3 then 0.05 when r.stars >= 4.5 then -0.15 else 0 end))
      when 26 then case when r.stars >= 4.5 then 0.72 else 0.85 end
      else 1 end;
    continue when random() >= chance;
    d := case r.age when 25 then 0.5 when 26 then (case when random() < 0.7 then 0.5 else 1 end)
         else (case when random() < 0.5 then 0.5 when random() < 0.8 then 1 else 1.5 end) end;
    d := least(d, r.stars - greatest(coalesce(r.peak_stars, r.stars) - 2, 1));
    continue when d <= 0;
    update public.players set stars = stars - d, last_drop = d, last_drop_season = cs where id = r.id;
    perform public.regress_ratings(r.id, d);
    if d >= 1 then perform public.log_event('regressed', r.id, r.team_id, format('%s slowed down: %s to %s stars', r.name, r.stars, r.stars - d)); end if;
    made := made + 1;
  end loop;
  return made;
end $function$;
