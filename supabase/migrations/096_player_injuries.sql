-- 096: injuries from games. Each one is saved with the game it happened in; a player is out until return_week (the week
-- he can play again: week + weeks out + 1, or 999 for the rest of the season). Everyone can read them, like a real injury
-- report. Only the commissioner's finished games write them (game_record_injuries), and a game re-finalized replaces its
-- own. Test games: the rows go with the game when the sandbox puts the real games back.
create table if not exists public.player_injuries (
  id bigserial primary key,
  player_id text not null references public.players(id) on delete cascade,
  team_id text not null,
  game_id bigint not null references public.games(id) on delete cascade,
  season int not null,
  week int not null,
  type text not null,
  label text not null,
  part text,
  severity text not null,
  weeks int not null check (weeks between 0 and 99),
  return_week int not null,
  created_at timestamptz not null default now()
);
create index if not exists player_injuries_season on public.player_injuries (season, return_week);
create index if not exists player_injuries_player on public.player_injuries (player_id);
alter table public.player_injuries enable row level security;
drop policy if exists "anyone reads injuries" on public.player_injuries;
create policy "anyone reads injuries" on public.player_injuries for select to anon, authenticated using (true);

create or replace function public.game_record_injuries(p_game bigint, p_injuries jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare g public.games; n int;
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  select * into g from public.games where id = p_game;
  if g.id is null or g.status <> 'final' then raise exception 'That game isn''t final'; end if;
  delete from public.player_injuries where game_id = p_game;
  insert into public.player_injuries (player_id, team_id, game_id, season, week, type, label, part, severity, weeks, return_week)
  select x->>'id', case when x->>'side' = 'home' then g.home_team else g.away_team end, p_game, g.season, g.week,
         left(x->>'type', 40), left(x->>'label', 80), left(x->>'part', 20), left(x->>'severity', 20),
         least(99, greatest(0, (x->>'weeks')::int)),
         case when (x->>'weeks')::int >= 99 then 999 else g.week + greatest(0, (x->>'weeks')::int) + 1 end
  from jsonb_array_elements(coalesce(p_injuries, '[]'::jsonb)) x
  where exists (select 1 from public.players p where p.id = x->>'id');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'saved', n);
end $$;
revoke all on function public.game_record_injuries(bigint, jsonb) from public, anon;
grant execute on function public.game_record_injuries(bigint, jsonb) to authenticated;
