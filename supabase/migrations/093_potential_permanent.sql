-- 093: a player's potential is permanent from the moment he's drafted or brought into the league. Two things used to move
-- it: a regressing veteran's potential dropped with his stars, and a commissioner setting a player's stars above his
-- potential raised it. Both are gone (the commissioner can still set potential on purpose with the Potential field).
-- Also puts the test league's potentials back to what they were when test mode started (test birthdays had lowered them).
do $mig$
declare d text;
begin
  d := pg_get_functiondef('public.regress_players'::regproc);
  d := replace(d, 'update public.player_potential set potential = least(potential, r.stars - d) where player_id = r.id;', '');
  execute d;
  d := pg_get_functiondef('public.commish_update_player'::regproc);
  d := replace(d, 'update public.player_potential set potential = greatest(potential, v) where player_id = pl.id;', '');
  execute d;
  if public.test_mode() then
    update public.player_potential cur set potential = (e->>'potential')::numeric
    from public.sandbox_backup b, jsonb_array_elements(b.rows) e
    where b.name = 'player_potential' and e->>'player_id' = cur.player_id and (e->>'potential')::numeric is distinct from cur.potential;
  end if;
end $mig$;
