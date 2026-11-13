-- Live game state, one row per game, shared by the commissioner's game screen and both coaching rooms: score, quarter, game
-- clock (seconds left when it last stopped, plus when it started running), timeouts, who receives the opening kick and which
-- way the home team goes (a coin flip on the server when the game starts). games.status is left alone.
create table if not exists public.game_state (
  game_id bigint primary key references public.games(id) on delete cascade,
  status text not null default 'pregame' check (status in ('pregame', 'live', 'halftime', 'final')),
  quarter smallint not null default 1 check (quarter between 1 and 5),
  quarter_seconds int not null default 900, clock_left int not null default 900, clock_running boolean not null default false, clock_since timestamptz,
  home_score int not null default 0, away_score int not null default 0, home_timeouts smallint not null default 3, away_timeouts smallint not null default 3,
  possession text, receiving text, home_dir text check (home_dir in ('left', 'right')), last_timeout text, last_timeout_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.game_state enable row level security;
create policy "anyone reads game state" on public.game_state for select using (true);
-- Functions (applied through the database tool, same bodies):
--   game_start(p_game)       commissioner: flips who receives (50/50) and the home team's direction (50/50), status live
--   game_clock(p_game, run)  commissioner: run or stop the clock
--   call_timeout(p_game)     coach of either team: stops the clock, one fewer timeout (3 per team), records who called it
--   game_reset(p_game)       commissioner (testing): deletes the state row
-- All four: security definer, search_path '', execute for authenticated only.
