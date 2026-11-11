-- MFL colleges (Noah's list + more in the same style, 45 total) for every player, and a TEST-only "restart the draft".

create or replace function public.college_names() returns text[] language sql immutable set search_path = '' as $$
  select array['Ole Moo', 'Pig State', 'Villager Tech', 'Massacowsetts Institute of Technology', 'University of North Pig''s', 'Cowlumbia University',
    'Texas A&M-ine', 'Enderman State', 'Pillagers University', 'Redstone Tech', 'Craftford University', 'Bedrock State', 'Obsidian Polytech',
    'Nether Dame', 'University of Wash-ing-stone', 'Creep-ton University', 'Boston Cow-lege', 'Ball State of Quartz', 'Zombie A&M',
    'Ohio Slime State', 'University of Mooregon', 'Penn Steve', 'University of Alabamboo', 'Clemsand University', 'Lava State University',
    'Geode-gia Tech', 'Mushigan State', 'UC Llama', 'Flower-ida State', 'University of Miamethyst', 'Oak-lahoma', 'TNT Tech', 'Wis-cobble-sin',
    'Tennes-sheep', 'Diamond Duke University', 'Harvestard University', 'Purpur-due University', 'Haylor University', 'Iron-wa State',
    'Nether-aska', 'Vine-ginia Tech', 'Spider-acuse University', 'Brewing Young University', 'University of Southern Cauldronia', 'Emer-Yale']
$$;

-- Same player, same college every time (so TEST mode and undo agree).
create or replace function public.college_for(p_id text) returns text language sql immutable set search_path = '' as $$
  select (public.college_names())[1 + abs(hashtext(p_id)) % array_length(public.college_names(), 1)]
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer, integer)'::regprocedure);
  d := regexp_replace(d, 'colleges text\[\] := ''\{[^}]*\}'';', 'colleges text[] := public.college_names();');
  execute d;
end $$;

update public.players set college = public.college_for(id) where id is not null;
-- TEST mode's saved copy of the players gets the same colleges, so leaving TEST keeps them.
update public.sandbox_backup set rows = (select jsonb_agg(x || jsonb_build_object('college', public.college_for(x->>'id'))) from jsonb_array_elements(rows) x)
where name = 'players';

-- TEST only: take the whole draft back so it can be run again (rookies return to the board, undrafted players come back from free agency).
create or replace function public.draft_restart_test() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_season int := public.setting_int('current_season'); s record; n int := 0; r record;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if (select value #>> '{}' from public.league_settings where key = 'sandbox') <> 'true' then raise exception 'Restarting the draft only works in TEST mode'; end if;
  for s in select * from public.draft_selections where season = v_season and status in ('approved', 'ready', 'pending') loop
    delete from public.contracts where player_id = s.player_id and source = 'draft';
    update public.players set status = 'prospect', team_id = null, number = null, depth = null, slot = null,
      rookie_season = null, draft_round = null, draft_pick = null, drafted_by = null where id = s.player_id;
    n := n + 1;
  end loop;
  update public.players set status = 'prospect' where draft_season = v_season and status = 'free_agent' and team_id is null;
  delete from public.draft_selections where season = v_season;
  delete from public.draft_room where season = v_season;
  for r in select distinct team_id, position from public.players where status = 'active' and team_id is not null loop
    perform public.place_depth(r.team_id, r.position);
  end loop;
  perform public.log_event('draft_restart', null, null, format('TEST: the Season %s draft was reset (%s picks taken back)', v_season, n));
  return jsonb_build_object('taken_back', n);
end $$;
revoke execute on function public.draft_restart_test() from public, anon;
grant execute on function public.draft_restart_test() to authenticated;
