-- Trade dates on the calendar: "Trades open" (trading stays shut until then if set) and "Trade deadline" (after Week 8),
-- plus the commissioner's switch to force trading open, shut, or back to the calendar.
create or replace function public.schedule_order(p_kind text) returns int language sql immutable set search_path = '' as $$
  select array_position(array['birthday', 'resign', 'trades_open', 'fa_open', 'fa_round_1', 'fa_round_2', 'fa_round_3', 'fa_round_4',
    'draft', 'camp', 'season_start', 'trade_deadline', 'craft_bowl'], p_kind)
$$;

create or replace function public.trades_open() returns boolean language sql stable security definer set search_path = '' as $$
  select case (select value #>> '{}' from public.league_settings where key = 'trade_window')
    when 'open' then true when 'closed' then false
    else (
      not exists (select 1 from public.league_schedule where season = public.setting_int('current_season') and kind = 'trades_open' and starts_at > now())
      and (
        ((select value #>> '{}' from public.league_settings where key = 'phase') = 'offseason' and public.setting_int('offseason_step') >= 3)
        or ((select value #>> '{}' from public.league_settings where key = 'phase') = 'regular_season'
            and not exists (select 1 from public.league_schedule where season = public.setting_int('current_season') and kind = 'trade_deadline' and starts_at <= now()))))
  end
$$;

create or replace function public.set_trade_window(p_mode text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_commissioner() then raise exception 'not allowed'; end if;
  if p_mode not in ('auto', 'open', 'closed') then raise exception 'Bad mode'; end if;
  update public.league_settings set value = to_jsonb(p_mode) where key = 'trade_window';
  perform public.notify(null, false, true, 'trade_window', case p_mode when 'open' then 'Trading is open' when 'closed' then 'Trading is closed' else 'Trading follows the calendar again' end,
    'Set by the commissioner.', jsonb_build_object('mode', p_mode));
  return jsonb_build_object('mode', p_mode, 'open', public.trades_open());
end $$;
revoke execute on function public.set_trade_window(text) from public, anon;
grant execute on function public.set_trade_window(text) to authenticated;
