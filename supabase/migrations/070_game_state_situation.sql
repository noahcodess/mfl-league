-- Down and distance, ball spot (yards from the offense's own goal line) and play clock on game_state, for the full scoreboards.
-- game_start now also sets 1st & 10 at the receiving team's 25 (a touchback until kickoffs come with the engine).
-- game_test_score(p_game, p_side, p_points): commissioner-only test button that adds points (-8..8) to a live game.
alter table public.game_state
  add column if not exists down smallint check (down between 1 and 4),
  add column if not exists togo smallint,
  add column if not exists ball_on smallint check (ball_on between 0 and 100),
  add column if not exists play_clock smallint not null default 40;
