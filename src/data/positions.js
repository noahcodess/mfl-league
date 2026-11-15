// League positions, in the order they show on a depth chart.
export const OFFENSE = ['QB', 'RB', 'WR', 'TE', 'C', 'OG', 'OT'];
export const DEFENSE = ['DL', 'DT', 'DE', 'LB', 'CB', 'SS'];
export const SPECIAL = ['K'];   // the kicker kicks and punts
export const ALL_POSITIONS = [...OFFENSE, ...DEFENSE, ...SPECIAL];

export const POSITION_NAMES = {
  QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', C: 'Center',
  OG: 'Offensive Guard', OT: 'Offensive Tackle', DL: 'Defensive Line', DT: 'Defensive Tackle',
  DE: 'Defensive End', LB: 'Linebacker', CB: 'Cornerback', SS: 'Strong Safety', K: 'Kicker',
};
