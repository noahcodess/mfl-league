-- Speed now depends on position (the site shows ratings out of 10: 9 = really fast, 10 = only a few players).
-- WR/CB fastest, then RB, SS, LB, DE, TE, QB, the D-line, and the O-line slowest.
create or replace function public.speed_offset(p_position text) returns int language sql immutable set search_path = '' as $$
  select case p_position when 'WR' then 6 when 'CB' then 6 when 'RB' then 5 when 'SS' then 3 when 'LB' then 0 when 'DE' then -2
    when 'TE' then -4 when 'QB' then -6 when 'DL' then -12 when 'DT' then -12 else -20 end
$$;

update public.player_attributes a set ratings = a.ratings || jsonb_build_object('speed',
    least(99, greatest(20, (a.ratings->>'speed')::int + public.speed_offset(p.position))))
from public.players p where p.id = a.player_id and p.name not in ('Bojan Kovacic', 'Garry Drake');

-- Garry Drake: more speed (a rare 10), paid for with a little catching.
update public.player_attributes set ratings = ratings || '{"speed": 98, "catching": 79}'
  where player_id = (select id from public.players where name = 'Garry Drake');

select public.refresh_ceilings(player_id) from public.player_attributes;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_attributes(text)'::regprocedure);
  execute replace(d, 'else target + raw[i] - shift end)))::int);',
    'when keys[i] = ''speed'' then target + raw[i] - shift + public.speed_offset(p.position)
      else target + raw[i] - shift end)))::int);');
end $$;

revoke execute on function public.speed_offset(text) from public, anon, authenticated;
