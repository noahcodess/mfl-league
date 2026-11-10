-- Draft classes are now planned like a real roster: every position gets its share (QB 4, RB 4, WR 8, TE 4, OT 8, OG 8,
-- C 4, DL 4, DT 8, DE 8, LB 8, CB 8, SS 4 in an 80-man class), plus a little extra where the league is short. That's
-- 48 draft picks with 32 more left for free agency. Also fixes the missing OCM 2nd-round pick (see below).

update public.league_settings set value = '80' where key = 'draft_class_size';

create or replace function public.generate_draft_class(p_season int, p_count int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  intl_now numeric := (select count(*) filter (where nationality <> 'USA')::numeric / greatest(count(*), 1) from public.players where status in ('active', 'free_agent'));
  intl_chance numeric := least(0.35, greatest(0.10, (0.18 - intl_now) * 3 + 0.10));
  countries text[] := '{Nigeria,Nigeria,Ghana,Jamaica,Samoa,Samoa,Tonga,Canada,Canada,England,Australia,Germany,Mexico,Mexico,Brazil,France}';
  colleges text[] := '{Alabama,Georgia,Ohio State,Michigan,LSU,Texas,Oklahoma,Clemson,Florida State,Miami,Oregon,USC,Penn State,Notre Dame,Tennessee,Auburn,Florida,Texas A&M,Wisconsin,Iowa,Utah,Washington,Ole Miss,Arkansas,Kentucky,Missouri,Baylor,TCU,Kansas State,North Carolina,NC State,Virginia Tech,Louisville,Pittsburgh,Boise State,Cincinnati,UCF,Oregon State,Stanford,Arizona State,Minnesota,Nebraska,Purdue,Houston,Memphis,Tulane,Appalachian State,North Dakota State,South Dakota State,Montana}';
  plan text[]; pos text; country text; nm text; age int; pot numeric; stars numeric; pid text; tries int; made int := 0; pl public.players;
  slots int := (select sum(starters + backups) from public.roster_template);
begin
  -- The class plan: each position's share of a full roster, at least 3 each, plus up to 2 extra where the league is thin.
  select array_agg(position order by random()) into plan from (
    select rt.position from public.roster_template rt,
      generate_series(1, greatest(3, round((rt.starters + rt.backups)::numeric * p_count / slots)::int
        + least(2, greatest(0, (16 * (rt.starters + rt.backups)
          - (select count(*) from public.players x where x.position = rt.position and x.status in ('active', 'free_agent'))) / 8)))) g) s;
  foreach pos in array plan loop
    country := case when random() < intl_chance then countries[1 + floor(random() * array_length(countries, 1))::int] else 'USA' end;
    tries := 0;
    loop
      nm := public.random_name(country);
      exit when not exists (select 1 from public.players where name = nm) or tries > 25;
      tries := tries + 1;
    end loop;
    age := case when random() < 0.68 then 21 else 22 end;
    pot := (array[2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5])[1 + floor(random() * 20)::int];
    stars := least(3.5, pot, greatest(1, pot - 2 + (array[-0.5, 0, 0, 0, 0.5])[1 + floor(random() * 5)::int]));
    pid := format('dr%s-%s', p_season, substr(md5(random()::text), 1, 6));
    insert into public.players (id, team_id, name, position, stars, elite, age, mood, nationality, notes, status, college, draft_season)
    values (pid, null, nm, pos, stars, false, age, 'normal', country, '{}', 'prospect',
            colleges[1 + floor(random() * array_length(colleges, 1))::int], p_season);
    insert into public.player_potential (player_id, potential) values (pid, pot);
    select * into pl from public.players where id = pid;
    update public.players set college_stats = public.college_profile(pl, pot) where id = pid;
    made := made + 1;
  end loop;
  return made;
end $$;
revoke execute on function public.generate_draft_class(int, int) from public, anon, authenticated;

-- The missing pick: OCM had no Season 8 2nd-rounder, and the only odd pick on the books was a dead "Season 7" DDC
-- 2nd-rounder owned by TGA (Season 7's draft is long over). Every team should have one pick per round, so that dead
-- pick becomes OCM's own Season 8 2nd-rounder.
update public.picks set season = 8, original_code = 'OCM', owner_id = 'ocm'
  where season = 7 and round = 2 and original_code = 'DDC' and owner_id = 'tga';
