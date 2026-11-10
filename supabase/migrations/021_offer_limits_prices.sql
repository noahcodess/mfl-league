-- Offer limits by round (coaches and bots alike): round 1 = 3 open offers, round 2 = 10, rounds 3-4 = as many as
-- you have open roster spots. Also market values come down about 6% across the board.

create or replace function public.fa_offer_limit(p_team text) returns int language sql stable security definer set search_path = '' as $$
  select case public.setting_int('fa_round') + 1 when 1 then 3 when 2 then 10
    else greatest(0, public.setting_int('max_roster') - public.team_roster_count(p_team)) end
$$;

create or replace function public.market_value(p public.players) returns int language sql stable set search_path = '' as $$
  select public.round5k(
    (case p.stars when 0.5 then 19000 when 1 then 28000 when 1.5 then 38000 when 2 then 47000 when 2.5 then 61000 when 3 then 80000
                  when 3.5 then 93000 when 4 then 117000 when 4.5 then 150000 when 5 then 198000 else 47000 end)
    * (case when p.elite then 1.15 else 1 end)
    * (case p.position when 'QB' then 1.25 when 'WR' then 1.1 when 'DE' then 1.1 when 'OT' then 1.1
                       when 'TE' then 0.9 when 'OG' then 0.9 when 'C' then 0.9 when 'DT' then 0.9 when 'SS' then 0.9 else 1 end)
    * (case p.age when 21 then 0.9 when 22 then 0.9 when 26 then 0.95 when 27 then 0.85 else 1 end)
    * (case when p.depth = 'backup' then 0.85 else 1 end))
$$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.make_fa_offer(text,int,int,text)'::regprocedure);
  d := replace(d, '>= public.setting_int(''max_open_offers'') then', '>= public.fa_offer_limit(my_team) then');
  execute replace(d, '''You can only have % offers out at once'', public.setting_int(''max_open_offers'')',
                     '''You can only have % offers out this round'', public.fa_offer_limit(my_team)');
  d := pg_get_functiondef('public.fa_quote(text)'::regprocedure);
  execute replace(d, '''offers_out'',', '''offers_max'', case when my_team is null then null else public.fa_offer_limit(my_team) end, ''offers_out'',');
  d := pg_get_functiondef('public.bot_fa_offers()'::regprocedure);
  execute replace(d, 'team_made >= max_offers', 'team_made >= public.fa_offer_limit(tm.id)');
  d := pg_get_functiondef('public.bot_star_bids()'::regprocedure);
  execute replace(d, '      continue when public.team_roster_count(tm.id) +',
    '      continue when (select count(*) from public.fa_offers o where o.team_id = tm.id and o.status = ''open'') >= public.fa_offer_limit(tm.id);
      continue when public.team_roster_count(tm.id) +');
end $$;

revoke execute on function public.fa_offer_limit(text), public.market_value(public.players) from public, anon, authenticated;
