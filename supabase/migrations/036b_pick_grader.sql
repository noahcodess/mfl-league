-- The pick grader: F to A+ with the reasons, looking at value on the board, roster need, win-now vs rebuilding, Craft Bowl runs and upside.

create or replace function public.grade_letter(p_score int) returns text language sql immutable set search_path = '' as $$
  select case when p_score >= 93 then 'A+' when p_score >= 87 then 'A' when p_score >= 81 then 'A-' when p_score >= 76 then 'B+'
    when p_score >= 71 then 'B' when p_score >= 66 then 'B-' when p_score >= 61 then 'C+' when p_score >= 56 then 'C' when p_score >= 51 then 'C-'
    when p_score >= 46 then 'D+' when p_score >= 41 then 'D' when p_score >= 36 then 'D-' else 'F' end
$$;

create or replace function public.draft_grade(p_sel bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.draft_selections; pl public.players; pot numeric; tm public.teams; rt public.roster_template;
  win_now boolean; cb text; have int; weakest numeric; better int; score numeric := 62; notes text[] := '{}';
begin
  select * into s from public.draft_selections where id = p_sel;
  select * into pl from public.players where id = s.player_id;
  select coalesce(max(potential), pl.stars + 1.5) into pot from public.player_potential where player_id = pl.id;
  select * into tm from public.teams where id = s.team_id;
  select * into rt from public.roster_template where position = pl.position;
  select string_agg(format('Season %s', ts.season), ', ' order by ts.season desc) into cb from public.team_seasons ts
    where ts.team_id = s.team_id and ts.season >= s.season - 2 and ts.playoff in ('champion', 'craft_bowl_loss');
  win_now := tm.gm_style = 'contender' or coalesce(tm.overall_rank, 99) <= 4 or cb is not null;
  select count(*), (array_agg(x.stars order by x.stars desc))[rt.starters] into have, weakest
    from public.players x where x.team_id = s.team_id and x.status = 'active' and x.position = pl.position;

  -- Value: how many clearly better players were still on the board.
  select count(*) into better from public.players o left join public.player_potential op on op.player_id = o.id
  where o.status = 'prospect' and o.draft_season = s.season and o.id <> pl.id
    and not exists (select 1 from public.draft_selections d where d.player_id = o.id and d.status <> 'denied')
    and o.stars + coalesce(op.potential, o.stars + 1.5) * 0.5 > pl.stars + pot * 0.5 + 0.25;
  if better = 0 then score := score + 14; notes := notes || 'Best player left on the board'::text;
  elsif better <= 3 then score := score + 7; notes := notes || format('Good value at pick #%s', s.pick_no);
  elsif better <= 8 then score := score - 4; notes := notes || format('A little early: %s higher-rated players were still there', better);
  else score := score - 15; notes := notes || format('Big reach: %s higher-rated players were still on the board', better); end if;

  -- Need: does he fill a hole or pile onto a full room?
  if have < rt.starters then score := score + 13; notes := notes || format('Fills a hole: they were short a starting %s', pl.position);
  elsif weakest is not null and pl.stars > weakest then score := score + 8; notes := notes || format('Can beat out their weakest starting %s (%s★)', pl.position, weakest);
  elsif have < rt.starters + rt.backups then score := score + 3; notes := notes || format('Adds needed depth at %s', pl.position);
  elsif have = rt.starters + rt.backups then score := score - 2; notes := notes || format('Depth piece: their %s room was already full', pl.position);
  else score := score - 9; notes := notes || format('Odd fit: they already have %s %ss', have, pl.position); end if;

  -- Timeline: win-now teams want help today, rebuilders want a ceiling.
  if win_now then
    if pl.stars >= 2.5 then score := score + 7;
      notes := notes || case when cb is not null then format('Craft Bowl team (%s) gets a rookie who can help now', cb) else 'Win-now team gets a rookie who can help right away' end;
    elsif pot >= 4.5 then notes := notes || 'Win-now team taking a long-term project'::text;
    else score := score - 7; notes := notes || 'Win-now team, but he won''t help much this season'::text; end if;
  elsif tm.gm_style = 'rebuilding' then
    if pot >= 4.5 then score := score + 9; notes := notes || 'Rebuilding team lands a high-ceiling prospect'::text;
    elsif pot >= 4 then score := score + 4; notes := notes || 'Solid upside for a rebuilding team'::text;
    else score := score - 6; notes := notes || 'A rebuilding team needed more upside here'::text; end if;
  elsif pot >= 4.5 or pl.stars >= 3 then score := score + 4; notes := notes || 'Helps now and later'::text;
  end if;

  if pot - pl.stars >= 2 then score := score + 3; notes := notes || 'Scouts love his upside'::text;
  elsif pot - pl.stars < 1 then score := score - 3; notes := notes || 'Already close to his ceiling'::text; end if;
  if s.pick_no <= 5 and pl.stars < 2.5 and pot < 4.5 then score := score - 6; notes := notes || 'Not the splash a top-5 pick should be'::text; end if;
  if s.how = 'auto' then score := score - 3; notes := notes || 'The clock ran out, so the computer picked'::text; end if;

  score := greatest(0, least(100, round(score)));
  update public.draft_selections set grade_score = score::int, grade = public.grade_letter(score::int), grade_notes = to_jsonb(notes[1:5]) where id = p_sel;
end $$;

revoke execute on function public.grade_letter(int), public.draft_grade(bigint), public.draft_advance(int, int), public.draft_announce_pick(bigint, int),
  public.draft_ready(bigint) from public, anon, authenticated;
