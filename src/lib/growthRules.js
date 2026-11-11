// How players grow, in plain words, so the Desk, the offseason steps and the Birthday screens all say the same thing.
export const GROWTH_SHORT = 'Every player turns a year older. Players 25 and under go up 1 star (never past their potential), 25 year olds can slip instead, 26 and 27 never grow, and 27 year olds retire.';

export const GROWTH_RULES = [
  ['🎂', 'Birthday:', 'every player 25 and under goes up 1 full star, but never past his potential. A 4★ with 4.5★ potential goes to 4.5★. A player already at his potential stays put.'],
  ['🎲', '25:', 'rolls for regression first (a bit under 40%; backups and weaker players more likely, starters and stars less). If he slips half a star, no growth that year. If he doesn\'t, he gets the +1.'],
  ['🛑', '26 and 27:', 'never grow, no matter what. This is when regression and retirement kick in.'],
  ['🏈', 'During the season:', 'players can also grow from how they play, 1 star at most. Most move about 0.3 to 0.5. (Turns on with the game engine.)'],
];
