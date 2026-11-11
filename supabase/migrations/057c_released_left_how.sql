-- 057c: 'released' is a real way to leave a team (commissioner release, cut at the trade deadline). The check was missing it.
alter table public.players drop constraint players_left_how_check;
alter table public.players add constraint players_left_how_check check (left_how = any (array['let_go', 'talks_failed', 'walked', 'released']));

-- Season 7's Craft Bowl from the standings (Lush Cave beat Crimson Forest).
insert into public.craft_bowls (season, champion, runner_up, note) select 7, 'lsc', 'crf', 'From the Season 7 standings' where not exists (select 1 from public.craft_bowls where season = 7);
