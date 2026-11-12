-- 064: Stadium names and capacities from Noah, and per-team field looks: an end zone font (block, bold, tall, italic, outline, 3d),
-- an end zone design (solid, diagonal, stripes, checker, chevron, border, fade, planks), and the stands style (standard, or spruce
-- wood for the Foxes). The commissioner can change all of them.
alter table public.stadiums add column if not exists endzone_font text not null default 'block'
  check (endzone_font in ('block', 'bold', 'tall', 'italic', 'outline', '3d'));
alter table public.stadiums add column if not exists endzone_design text not null default 'diagonal'
  check (endzone_design in ('solid', 'diagonal', 'stripes', 'checker', 'chevron', 'border', 'fade', 'planks'));
alter table public.stadiums add column if not exists stand_style text not null default 'standard' check (stand_style in ('standard', 'spruce'));

update public.stadiums s set name = x.n, capacity = x.c, endzone_font = x.f, endzone_design = x.d, stand_style = x.st, updated_at = now()
from (values
  ('crf', 'The Crimson Crown', 97000, '3d', 'chevron', 'standard'), ('snm', 'Death Valley', 89000, 'bold', 'diagonal', 'standard'),
  ('void', 'The Event Horizon', 80000, 'outline', 'checker', 'standard'), ('ntw', 'The Bone Yard', 76000, 'italic', 'stripes', 'standard'),
  ('ddc', 'Bounce House', 72500, 'tall', 'border', 'standard'), ('ocn', 'Riptide Stadium', 71000, 'italic', 'fade', 'standard'),
  ('edc', 'Purpur Park', 70000, '3d', 'fade', 'standard'), ('lsc', 'The Grotto', 68000, 'outline', 'stripes', 'standard'),
  ('tga', 'The Timberyard', 66500, 'block', 'planks', 'spruce'), ('ocm', 'Prismarine Stadium', 65000, 'tall', 'stripes', 'standard'),
  ('wrf', 'Warped Field', 63500, 'outline', 'diagonal', 'standard'), ('pln', 'The Pigpen', 60500, 'bold', 'checker', 'standard'),
  ('wsl', 'Phantom Field', 60000, '3d', 'border', 'standard'), ('drf', 'The Crypt', 59000, 'italic', 'border', 'standard'),
  ('flf', 'Iron Garden', 58500, 'tall', 'solid', 'standard'), ('dst', 'The Web', 57000, 'bold', 'chevron', 'standard')) x(id, n, c, f, d, st)
where s.team_id = x.id;

drop function if exists public.commish_set_stadium(text, text, int);
create or replace function public.commish_set_stadium(p_team text, p_name text, p_capacity int, p_font text, p_design text, p_style text) returns jsonb
language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 40 then raise exception 'Give the stadium a name (2 to 40 letters)'; end if;
  if p_capacity is null or p_capacity not between 1000 and 200000 then raise exception 'Capacity goes from 1,000 to 200,000'; end if;
  insert into public.stadiums (team_id, name, capacity, endzone_font, endzone_design, stand_style, updated_at)
  values (p_team, trim(p_name), p_capacity, coalesce(p_font, 'block'), coalesce(p_design, 'diagonal'), coalesce(p_style, 'standard'), now())
  on conflict (team_id) do update set name = excluded.name, capacity = excluded.capacity, endzone_font = excluded.endzone_font,
    endzone_design = excluded.endzone_design, stand_style = excluded.stand_style, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.commish_set_stadium(text, text, int, text, text, text) to authenticated;
