-- Play styles (Noah's signature players), saved portrait looks (commissioner-only edits), the max age rule,
-- and a guard so the offseason aging runs only once per season.
alter table public.players add column play_style text;
alter table public.players add column looks jsonb not null default '{}';
insert into public.league_settings (key, value) values ('max_age', '27'), ('aged_for_season', '7') on conflict (key) do nothing;
