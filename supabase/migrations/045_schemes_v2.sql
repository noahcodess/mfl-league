-- Schemes v2 (Madden-style): 6 offenses and 6 defenses. Spread Option is gone, Man Press became Lockdown Man.
create or replace function public.set_my_scheme(p_offense text, p_defense text, p_auto boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.my_team_id(); c public.coaches;
begin
  if me is null then raise exception 'Only a coach can set his scheme'; end if;
  if p_offense not in ('air_raid', 'west_coast', 'balanced', 'ground_pound', 'vertical', 'zone_run') then raise exception 'Unknown offense'; end if;
  if p_defense not in ('blitz', 'lockdown_man', 'balanced', 'cover2', 'cover3', 'bend') then raise exception 'Unknown defense'; end if;
  update public.coaches set scheme = jsonb_build_object('auto', coalesce(p_auto, false), 'offense', p_offense, 'defense', p_defense), updated_at = now()
  where team_id = me returning * into c;
  perform public.notify(null, true, false, 'coach_edit', format('Coach %s changed his scheme', c.name),
    case when p_auto then 'Set to Auto.' else format('Offense: %s · Defense: %s', p_offense, p_defense) end, jsonb_build_object('team', me));
  return to_jsonb(c);
end $$;

update public.coaches set scheme = scheme
  || jsonb_build_object('offense', case scheme->>'offense' when 'spread_option' then 'zone_run' else coalesce(scheme->>'offense', 'balanced') end)
  || jsonb_build_object('defense', case scheme->>'defense' when 'man_press' then 'lockdown_man' when 'zone' then 'cover2' else coalesce(scheme->>'defense', 'balanced') end)
where team_id is not null;
