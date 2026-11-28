-- 105: playoff results go on each team's season record the moment a playoff game is final, so next season's draft order
-- (set_draft_order: missed < lost in the Quarterfinals < lost in the Semifinals < lost the Craft Bowl < champion) and the
-- league history know how far everyone went. Losing a Quarterfinal = 'divisional', a Semifinal = 'conference', the
-- Craft Bowl = 'craft_bowl_loss', winning it = 'champion' (a team still alive stays 'missed' until it's out or wins it all).
-- A game taken back (test tools) puts both teams back to still alive.

create or replace function public.trg_playoff_result() returns trigger language plpgsql security definer set search_path to '' as $function$
declare win text; lose text; done text;
begin
  if new.kind not in ('quarterfinal', 'semifinal', 'craft_bowl') then return new; end if;
  if new.status = 'final' and old.status is distinct from 'final' and new.home_score is distinct from new.away_score then
    win := case when new.home_score > new.away_score then new.home_team else new.away_team end;
    lose := case when win = new.home_team then new.away_team else new.home_team end;
    done := case new.kind when 'quarterfinal' then 'divisional' when 'semifinal' then 'conference' else 'craft_bowl_loss' end;
    update public.team_seasons set playoff = done where season = new.season and team_id = lose;
    if new.kind = 'craft_bowl' then update public.team_seasons set playoff = 'champion' where season = new.season and team_id = win; end if;
  elsif old.status = 'final' and new.status is distinct from 'final' then
    update public.team_seasons set playoff = 'missed' where season = new.season and team_id in (new.home_team, new.away_team);
  end if;
  return new;
end $function$;

drop trigger if exists games_playoff_result on public.games;
create trigger games_playoff_result after update of status on public.games for each row execute function public.trg_playoff_result();
