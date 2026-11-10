// Turns a player's bars into words: up to 3 strengths (his best bars) and up to 3 weaknesses (his worst), measured
// against his own average, so the words always match the numbers. Phrases describe how he plays, never who he's like.
const PHRASES = {
  throw_power: ['Big arm', 'Weak arm'], short_acc: ['Accurate on short throws', 'Misses easy throws'],
  deep_acc: ['Drops dimes deep', 'Inaccurate deep'], throw_on_run: ['Makes off-platform throws on the move', 'Struggles throwing on the run'],
  vision: ['Reads defenses fast', 'Locks onto his first read'], break_sack: ['Escapes pressure and extends plays', 'Takes too many sacks'],
  speed: ['Elite speed', 'Slow'], toughness: ['Never wears down, rarely hurt', 'Wears down and gets hurt'],
  throw_pressure: ['Delivers with defenders in his face', 'Rattled under pressure'], play_action: ['Sells play action', 'Play action fools nobody'],
  run_after_catch: ['Dangerous after the catch', 'Goes down after the catch'], spectacular_catch: ['Makes highlight-reel catches', 'Won\'t make the circus catch'],
  discipline: ['Rarely gets flagged', 'Penalty prone'], double_team: ['Beats double teams', 'Disappears against double teams'],
  blitzing: ['Dangerous blitzer', 'Ineffective blitzer'],
  acceleration: ['Explosive first step', 'Slow to get going'], elusiveness: ['Makes defenders miss', 'Easy to bring down'],
  break_tackle: ['Runs through tackles', 'Goes down on first contact'], carrying: ['Rarely fumbles', 'Fumble prone'],
  catching: ['Soft hands', 'Drops passes'], route_running: ['Crisp routes', 'Sloppy routes'], release: ['Beats press coverage', 'Gets jammed at the line'],
  catch_traffic: ['Wins contested catches', 'Loses 50-50 balls'], jumping: ['High-points the ball', 'Can\'t win jump balls'],
  agility: ['Shifty in tight spaces', 'Stiff hips'], run_block: ['Moves people in the run game', 'Weak run blocker'],
  pass_block: ['Wall in pass protection', 'Leaky in pass protection'], strength: ['Overpowers people', 'Gets overpowered'],
  footwork: ['Quick, clean feet', 'Heavy feet'], anchor: ['Holds up against the bull rush', 'Gets pushed back'],
  awareness: ['Never misses an assignment', 'Blows assignments'], snapping: ['Perfect snaps every time', 'Shaky snaps'],
  power_moves: ['Powerful bull rush', 'No power to his rush'], finesse_moves: ['Slippery pass rush moves', 'Few pass rush moves'],
  block_shed: ['Sheds blocks fast', 'Gets stuck on blocks'], run_stop: ['Stuffs the run', 'Gets pushed around on runs'],
  pursuit: ['Chases plays down', 'Gives up on plays'], speed_rush: ['Bends the edge', 'No speed off the edge'],
  tackling: ['Sure tackler', 'Misses tackles'], play_rec: ['Diagnoses plays fast', 'Bites on fakes'], hit_power: ['Big hitter', 'Light hitter'],
  zone_cover: ['Smart in zone coverage', 'Lost in zone'], man_cover: ['Sticky in man coverage', 'Gets beat in man'],
  press: ['Physical at the line', 'Soft at the line'], ball_skills: ['Takes the ball away', 'Rarely makes plays on the ball'],
};
const RB_VISION = ['Finds the running lane', 'Misses running lanes'];

export function strengthsAndWeaknesses(position, ratings) {
  if (!ratings) return { strengths: [], weaknesses: [] };
  const entries = Object.entries(ratings);
  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  const words = (k) => (k === 'vision' && position === 'RB' ? RB_VISION : PHRASES[k]) || [k, k];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return {
    strengths: sorted.filter(([, v]) => v >= avg + 5 || v >= 90).slice(0, 3).map(([k]) => words(k)[0]),
    weaknesses: sorted.reverse().filter(([, v]) => v <= avg - 5 && v < 75).slice(0, 3).map(([k]) => words(k)[1]),
  };
}
