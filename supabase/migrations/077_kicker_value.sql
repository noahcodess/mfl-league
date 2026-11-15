-- Kickers matter, but a kicker is never worth what a starter at any other spot is worth. Bots value them at 45%: they
-- won't burn a 1st-round pick on one or trade a good receiver for one. Draft grades call out an early kicker pick.
create or replace function public.position_weight(p_position text) returns numeric language sql immutable set search_path to '' as $$
  select case when p_position = 'K' then 0.45 else 1 end
$$;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.draft_bot_choice(text,integer)'::regprocedure);
  n := replace(d, 'public.bot_future_fit(p_team, pr.position))', 'public.bot_future_fit(p_team, pr.position)) * public.position_weight(pr.position)');
  if n = d then raise exception 'draft_bot_choice: pattern not found'; end if;
  execute n;
  d := pg_get_functiondef('public.bot_player_value(text,text,text,jsonb,boolean)'::regprocedure);
  n := replace(d, 'v := v * public.bot_fit(p_team, p.position);', 'v := v * public.bot_fit(p_team, p.position) * public.position_weight(p.position);');
  if n = d then raise exception 'bot_player_value: pattern not found'; end if;
  execute n;
  d := pg_get_functiondef('public.draft_grade(bigint)'::regprocedure);
  n := replace(d, '  if s.how = ''auto'' then', '  if pl.position = ''K'' and s.pick_no <= 16 then score := score - 15; notes := notes || ''Kickers almost never go in the 1st round''::text;
  elsif pl.position = ''K'' and s.pick_no <= 32 then score := score - 6; notes := notes || ''Early for a kicker''::text; end if;
  if s.how = ''auto'' then');
  if n = d then raise exception 'draft_grade: pattern not found'; end if;
  execute n;
end $$;
