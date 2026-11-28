-- 108: every team can have a gold logo (uploaded by the commissioner on its team page) that the Craft Bowl broadcast
-- uses instead of its normal logo. No gold logo = the normal one. It's a league setting, so it survives test mode.
alter table public.teams add column if not exists gold_logo_url text;

create or replace function public.set_team_gold_logo(p_team text, p_url text) returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_url is not null and p_url !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/team-logos/' then raise exception 'Upload the logo first'; end if;
  update public.teams set gold_logo_url = p_url where id = p_team;
  if not found then raise exception 'No such team'; end if;
  -- a league setting, not test data: keep it when test mode ends too
  update public.sandbox_backup b set rows = (select jsonb_agg(case when x->>'id' = p_team then jsonb_set(x, '{gold_logo_url}', coalesce(to_jsonb(p_url), 'null'::jsonb)) else x end) from jsonb_array_elements(b.rows) x)
    where b.name = 'teams';
  perform public.log_event('team_edit', null, p_team, format('The %s %s', (select name from public.teams where id = p_team), case when p_url is null then 'removed their gold Craft Bowl logo' else 'have a gold Craft Bowl logo' end));
end $function$;
