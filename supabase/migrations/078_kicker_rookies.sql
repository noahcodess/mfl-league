-- Kicker rookies arrive raw: 1 star at minimum, most at 1.5, only the best prospects (4.5+ potential) at 2. They grow at the
-- normal rate, so kickers peak late in their careers. Classes carry 3-4 kickers on average, never more than 6.
create or replace function public.kicker_rookie_stars(p_pot numeric) returns numeric language sql volatile set search_path to '' as $$
  select case when p_pot >= 4.5 then 2 when p_pot >= 3.5 then (case when random() < 0.15 then 2 else 1.5 end)
              else (case when random() < 0.5 then 1 else 1.5 end) end::numeric
$$;
create or replace function public.kicker_class_count() returns integer language sql volatile security definer set search_path to '' as $function$
  select least(6, 3 + (case when random() < 0.55 then 1 else 0 end) + (case when random() < 0.12 then 1 else 0 end)
    - (case when random() < 0.2 then 1 else 0 end)
    + case when (select count(*) from public.players where position = 'K' and status in ('active', 'free_agent')) < 20 then 1 else 0 end)
$function$;
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.generate_draft_class(integer,integer,text)'::regprocedure);
  n := replace(d, 'stars := least(3.5, pot, greatest(1.5, pot - 1 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int]));', 'stars := public.kicker_rookie_stars(pot);');
  if n = d then raise exception 'generate_draft_class: pattern not found'; end if;
  execute n;
end $$;
