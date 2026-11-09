-- Jersey numbers (0-99, unique per team) and the switch to the Season 8 offseason.
alter table public.players add column number int check (number between 0 and 99);
create unique index players_team_number_idx on public.players(team_id, number) where number is not null;
