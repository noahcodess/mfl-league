-- Fix: bot_pick_specialty named a variable "slot", the same as the game_uniforms/team_jerseys column, so Postgres stopped with
-- "column reference slot is ambiguous" when the league moved to Week 1 (that's when bots pick their specialty games).
create or replace function public.bot_pick_specialty() returns int
language plpgsql security definer set search_path to '' as $$
declare t record; cs int := public.setting_int('current_season'); alt int; n int := 0;
begin
  for t in select id from public.teams where not exists (select 1 from public.profiles pr where pr.team_id = teams.id) loop
    continue when (select count(*) from public.game_uniforms u join public.games x on x.id = u.game_id where u.team_id = t.id and x.season = cs and x.kind = 'regular') >= 2;
    alt := null;
    select j.slot into alt from public.team_jerseys j where j.team_id = t.id and j.slot in (3, 4)
      order by 0.299 * ('x' || substr(j.colors->>'jersey', 2, 2))::bit(8)::int + 0.587 * ('x' || substr(j.colors->>'jersey', 4, 2))::bit(8)::int
        + 0.114 * ('x' || substr(j.colors->>'jersey', 6, 2))::bit(8)::int asc limit 1;  -- darkest alternate
    insert into public.game_uniforms (game_id, team_id, slot)
    select g.id, t.id, coalesce(alt, 3) from public.games g
    where g.season = cs and g.kind = 'regular' and g.home_team = t.id and g.status <> 'final'
      and not exists (select 1 from public.game_uniforms u where u.game_id = g.id and u.team_id = t.id)
    order by public.is_rivalry(g.home_team, g.away_team) desc, (g.prime like '%night') desc nulls last, random()
    limit 2 - (select count(*) from public.game_uniforms u join public.games x on x.id = u.game_id where u.team_id = t.id and x.season = cs and x.kind = 'regular');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.bot_pick_specialty() from public, anon, authenticated;

-- Draft night trade wire: commissioner only. Offers stay private until he announces them on stage.
create or replace function public.draft_trade_wire(p_season integer) returns table (
  trade_id bigint, kind text, from_team text, to_team text, at timestamptz, from_gets text, to_gets text)
language sql stable security definer set search_path = '' as $$
  with room as (select 1 from public.draft_room where season = p_season and status in ('live', 'paused') and public.is_commissioner()),
  recent as (select t.* from public.trades t where exists (select 1 from room) and t.created_at > now() - interval '12 hours'),
  items as (
    select i.trade_id, i.side, coalesce(pl.name || ' (' || pl.position || ')', 'Season ' || k.season || ' round ' || k.round || ' pick (' || upper(k.original_code) || ')') as what
    from public.trade_items i join recent r on r.id = i.trade_id and r.status = 'accepted'
    left join public.players pl on pl.id = i.player_id left join public.picks k on k.id = i.pick_id)
  select r.id, 'offer', r.from_team, r.to_team, r.created_at, null::text, null::text from recent r
  union all
  select r.id, r.status, r.from_team, r.to_team, r.decided_at,
    (select string_agg(what, ', ') from items where items.trade_id = r.id and items.side = 'get'),
    (select string_agg(what, ', ') from items where items.trade_id = r.id and items.side = 'give')
  from recent r where r.status in ('accepted', 'declined') and r.decided_at is not null
  order by 5 desc
  limit 30
$$;
revoke execute on function public.draft_trade_wire(integer) from public, anon;
grant execute on function public.draft_trade_wire(integer) to authenticated;
