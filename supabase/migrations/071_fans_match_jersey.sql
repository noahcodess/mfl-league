-- 071: Dress the fans. When a coach picks an alternate jersey for a home game, he can switch on "every fan wears this color":
-- the whole crowd shows up in that jersey's main color (a whiteout, a blackout, a bloodbath). Off unless he turns it on.
alter table public.game_uniforms add column if not exists fans_match boolean not null default false;

-- p_slot 3 or 4 picks that alternate for the game; null takes the pick back. p_fans dresses the crowd in the jersey's color.
drop function if exists public.pick_specialty_game(bigint, int);
create or replace function public.pick_specialty_game(p_game bigint, p_slot int, p_fans boolean default false) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare me text := public.my_team_id(); g public.games; used int;
begin
  if me is null then raise exception 'Only a team''s coach can pick specialty games'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null or g.home_team is distinct from me then raise exception 'Specialty uniforms are for your home games'; end if;
  if g.status = 'final' then raise exception 'That game was already played'; end if;
  if g.kind = 'preseason' then raise exception 'Specialty games are regular season and playoff home games'; end if;
  if g.kind = 'regular' and ((select value #>> '{}' from public.league_settings where key = 'phase') <> 'offseason' or g.season <> public.setting_int('current_season')) then
    raise exception 'Regular season specialty games are picked during the preseason'; end if;
  if p_slot is null then delete from public.game_uniforms where game_id = p_game and team_id = me; return jsonb_build_object('ok', true); end if;
  if p_slot not in (3, 4) then raise exception 'Pick one of your two alternate jerseys'; end if;
  if g.kind = 'regular' then
    select count(*) into used from public.game_uniforms u join public.games x on x.id = u.game_id
      where u.team_id = me and x.season = g.season and x.kind = 'regular' and u.game_id <> p_game;
    if used >= 2 then raise exception 'You already picked your 2 specialty games. Take one back first.'; end if;
  end if;
  insert into public.game_uniforms (game_id, team_id, slot, fans_match) values (p_game, me, p_slot, coalesce(p_fans, false))
  on conflict (game_id, team_id) do update set slot = excluded.slot, fans_match = excluded.fans_match, picked_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pick_specialty_game(bigint, int, boolean) from public, anon;
grant execute on function public.pick_specialty_game(bigint, int, boolean) to authenticated;
