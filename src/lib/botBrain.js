// Words for a bot coach's brain: personality types, team modes, the four values, and the Player/Bot/Interim tag.

export const ARCHETYPES = {
  gunslinger: { name: 'The Gunslinger', icon: '🎲', line: 'Swings big. Moves picks for stars and lives with the bill.', trade: 'Easiest to deal with if you bring talent' },
  architect: { name: 'The Architect', icon: '📐', line: 'Builds through the draft. Loves picks and young talent, hates paying for age.', trade: 'Wants picks and youth back' },
  old_school: { name: 'Old School', icon: '📼', line: 'Trusts his guys. Rarely trades, and values proven vets.', trade: 'Toughest in the league to trade with' },
  moneyball: { name: 'Moneyball', icon: '🧮', line: 'All about value per dollar. Cheap contracts and smart deals.', trade: 'Hates big contracts coming back' },
  steady: { name: 'Steady Hand', icon: '⚖️', line: 'Patient and balanced. Only moves when the price is right.', trade: 'Fair, but never gives anything away' },
  former_player: { name: 'The Former Player', icon: '🏈', line: 'Played in this league. Trusts tough, proven players and his gut.', trade: 'Wants real football players back, not just picks' },
  dealmaker: { name: 'The Dealmaker', icon: '📞', line: 'Always on the phone. Will talk about anyone and loves a busy deadline.', trade: 'Most open to a deal in the league' },
  talent_scout: { name: 'The Talent Scout', icon: '🔭', line: 'Lives in the film room. Swears by upside and hunts late-round gems.', trade: 'Prizes young players with high potential' },
  caretaker: { name: 'No head coach yet', icon: '🪑', line: 'This seat is reserved for a coach joining soon. The roster stays full and the team makes no trades.', trade: 'The commissioner answers trades for this team' },
};
export const archetype = (key) => ARCHETYPES[key] || ARCHETYPES.steady;

export const MODES = {
  win_now: { name: 'Win now', icon: '🏆', line: 'Going for the Craft Bowl. Proven players over picks.' },
  balanced: { name: 'Reloading', icon: '🔄', line: 'In the middle. Only moves for real value.' },
  rebuild: { name: 'Rebuilding', icon: '🌱', line: 'Playing the long game. Picks and young talent first.' },
};
export const teamMode = (key) => MODES[key] || MODES.balanced;

export const VALUES = [['picks', 'Draft picks'], ['youth', 'Young talent'], ['stars', 'Star power'], ['cap', 'Cap savings']];

// 'person' | 'bot' | 'interim' (reserved seat, no head coach yet) with its label.
export function whoTag({ human, reserved }) {
  if (human) return { cls: 'person', label: '👤 Player' };
  if (reserved) return { cls: 'interim', label: '🪑 Reserved' };
  return { cls: 'bot', label: '🤖 Bot' };
}

// Short situation bullets a coach would say about his own team.
export function situationLines(s) {
  if (!s) return [];
  const out = [`Lineup ranks #${s.rank} of 16 (${Number(s.strength).toFixed(2)}★ starters).`];
  if (s.old_core >= 8) out.push(`Veteran heavy: ${s.old_core} of the 4★+ players are 26 or older.`);
  if (s.young_core >= 4) out.push(`Young core: ${s.young_core} players 3.5★+ at 23 or younger.`);
  out.push(`${s.picks} picks in the next two drafts (${s.firsts} first-rounder${s.firsts === 1 ? '' : 's'}).`);
  if (s.expiring >= 10) out.push(`${s.expiring} contracts end after this season.`);
  out.push(`$${((s.cap_room || 0) / 1e6).toFixed(2)}M of cap room.`);
  return out;
}
