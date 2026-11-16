-- Kicker draft prospects enter the league at 22. Also run once on the live league: the Season 8 kicker prospects set to 22,
-- and Devin Bynum (4.5 stars) swapped off the Creepers for a random 4-star kicker so the league owner's team isn't favored.
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer,integer,text)'::regprocedure);
  n := replace(d, E'    if pos = ''K'' then\n      pot := public.kicker_potential(true);', E'    if pos = ''K'' then\n      age := 22;   -- kickers enter the league at 22\n      pot := public.kicker_potential(true);');
  if n = d then raise exception 'generate_draft_class: pattern not found'; end if;
  execute n;
end $$;
