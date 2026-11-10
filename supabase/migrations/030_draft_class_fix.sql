-- Draft class fixes: positions picked by weighted chance (a full roster's shape plus a modest boost for positions the
-- league is short on) instead of the most-needed spot every time; talent nudged up so most good prospects come in at
-- 2-3 stars (still about 2 under potential, max 3.5). Adds a commissioner-only reroll for a class.

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer,integer)'::regprocedure);
  d := replace(d, 'pos text; country text;', 'pos text; roll numeric; country text;');
  d := replace(d, '    select rt.position into pos from public.roster_template rt
      order by (rt.starters + rt.backups) * (1 + random() * 1.5)
        + greatest(0, 16 * (rt.starters + rt.backups) - (select count(*) from public.players x where x.position = rt.position and x.status in (''active'', ''free_agent''))) * 0.15
        desc limit 1;',
    '    roll := random();
    select position into pos from (
      select w.position, sum(w.weight) over (order by w.position) / sum(w.weight) over () as cum from (
        select rt.position, (rt.starters + rt.backups) + least(4, greatest(0, 16 * (rt.starters + rt.backups)
          - (select count(*) from public.players x where x.position = rt.position and x.status in (''active'', ''free_agent''))) * 0.05) as weight
        from public.roster_template rt) w) c
    where c.cum >= roll order by c.cum limit 1;');
  d := replace(d, 'pot := (array[2, 2, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5])[1 + floor(random() * 20)::int];',
    'pot := (array[2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5])[1 + floor(random() * 20)::int];');
  d := replace(d, 'if random() < 0.5 then pot := least(5, pot + (array[-0.5, 0, 0, 0.5])[1 + floor(random() * 4)::int]); end if;', '');
  execute d;
end $$;

create or replace function public.reroll_draft_class(p_season int) returns int
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  delete from public.players where status = 'prospect' and draft_season = p_season;
  return public.generate_draft_class(p_season, coalesce(public.setting_int('draft_class_size'), 72));
end $$;
revoke execute on function public.reroll_draft_class(int) from public, anon;
grant execute on function public.reroll_draft_class(int) to authenticated;
