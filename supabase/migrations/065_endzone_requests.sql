-- 065: End zones become a team customization. New fonts: scribble (handwriting, for everyone) and three team-only fonts:
-- golem (Flower Forest Golems), future (End City Blazes), cartoon (Snowy Mountain Creepers). The planks background is gone
-- (the Foxes go back to solid orange). Coaches request end zone changes; the commissioner approves, denies, or edits directly.
update public.stadiums set endzone_design = 'solid' where endzone_design = 'planks';
alter table public.stadiums drop constraint if exists stadiums_endzone_font_check;
alter table public.stadiums add constraint stadiums_endzone_font_check
  check (endzone_font in ('block', 'bold', 'tall', 'italic', 'outline', '3d', 'scribble', 'golem', 'future', 'cartoon'));
alter table public.stadiums drop constraint if exists stadiums_endzone_design_check;
alter table public.stadiums add constraint stadiums_endzone_design_check
  check (endzone_design in ('solid', 'diagonal', 'stripes', 'checker', 'chevron', 'border', 'fade'));
update public.stadiums set endzone_font = x.f from (values ('flf', 'golem'), ('edc', 'future'), ('snm', 'cartoon')) x(id, f) where team_id = x.id;

-- Team-only fonts can only be used by their team.
create or replace function public.endzone_font_ok(p_font text, p_team text) returns boolean
language sql immutable set search_path to '' as $$
  select case p_font when 'golem' then p_team = 'flf' when 'future' then p_team = 'edc' when 'cartoon' then p_team = 'snm'
    else p_font in ('block', 'bold', 'tall', 'italic', 'outline', '3d', 'scribble') end
$$;

create table if not exists public.endzone_requests (
  id bigserial primary key, team_id text not null references public.teams(id), font text not null, design text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(), decided_at timestamptz);
create unique index if not exists endzone_requests_one_pending on public.endzone_requests (team_id) where status = 'pending';
alter table public.endzone_requests enable row level security;
drop policy if exists "anyone reads endzone requests" on public.endzone_requests;
create policy "anyone reads endzone requests" on public.endzone_requests for select using (true);

create or replace function public.request_endzone_change(p_font text, p_design text) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); st public.stadiums; rid bigint;
begin
  if me is null then raise exception 'Only a team''s coach can ask for that'; end if;
  if not public.endzone_font_ok(p_font, me) then raise exception 'That font belongs to another team'; end if;
  if p_design not in ('solid', 'diagonal', 'stripes', 'checker', 'chevron', 'border', 'fade') then raise exception 'Pick a background'; end if;
  select * into st from public.stadiums where team_id = me;
  if st.endzone_font = p_font and st.endzone_design = p_design then raise exception 'Nothing changed'; end if;
  update public.endzone_requests set status = 'denied', decided_at = now() where team_id = me and status = 'pending';
  insert into public.endzone_requests (team_id, font, design) values (me, p_font, p_design) returning id into rid;
  perform public.notify(null, true, false, 'endzone_request', format('End zone change: %s', (select name from public.teams where id = me)),
    'Approve it to paint the new end zones, or deny it.', jsonb_build_object('request', rid, 'team', me, 'font', p_font, 'design', p_design,
      'before', jsonb_build_object('font', st.endzone_font, 'design', st.endzone_design)));
  return jsonb_build_object('request', rid);
end $$;

create or replace function public.decide_endzone_change(p_request bigint, p_approve boolean) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare r public.endzone_requests;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into r from public.endzone_requests where id = p_request for update;
  if r.status is distinct from 'pending' then raise exception 'That request was already decided (or replaced by a newer one)'; end if;
  if p_approve then update public.stadiums set endzone_font = r.font, endzone_design = r.design, updated_at = now() where team_id = r.team_id; end if;
  update public.endzone_requests set status = case when p_approve then 'approved' else 'denied' end, decided_at = now() where id = r.id;
  perform public.notify(r.team_id, false, false, 'endzone_' || case when p_approve then 'approved' else 'denied' end,
    format('Your end zone change was %s', case when p_approve then 'approved' else 'denied' end),
    case when p_approve then 'The new end zones are painted.' else 'The commissioner said no. You can send a different look.' end, '{}'::jsonb);
  return jsonb_build_object('approved', p_approve);
end $$;

-- The commissioner's direct edit checks team-only fonts too.
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.commish_set_stadium(text, text, integer, text, text, text)'::regprocedure);
  d := replace(d, $x$  if p_capacity is null or p_capacity not between 1000 and 200000 then raise exception 'Capacity goes from 1,000 to 200,000'; end if;$x$,
    $x$  if p_capacity is null or p_capacity not between 1000 and 200000 then raise exception 'Capacity goes from 1,000 to 200,000'; end if;
  if p_font is not null and not public.endzone_font_ok(p_font, p_team) then raise exception 'That font belongs to another team'; end if;
  update public.endzone_requests set status = 'denied', decided_at = now() where team_id = p_team and status = 'pending'
    and (p_font is distinct from (select endzone_font from public.stadiums where team_id = p_team) or p_design is distinct from (select endzone_design from public.stadiums where team_id = p_team));$x$);
  if d not like '%endzone_font_ok%' then raise exception 'commish_set_stadium patch failed'; end if;
  execute d;
end $do$;

grant execute on function public.request_endzone_change(text, text), public.decide_endzone_change(bigint, boolean) to authenticated;
