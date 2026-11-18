// Player of the Game: a game score for every player's line (yards, touchdowns, turnovers, big defensive plays), winners
// get a nudge. Skill players usually take it; a defender needs something huge (two picks, a pick-six, a pile of sacks).
const r = (s, k) => s[k] || 0;
export function gameScore(s) {
  const pass = r(s, 'att') ? r(s, 'pyds') * 0.04 + r(s, 'ptd') * 4 - r(s, 'int') * 3 - r(s, 'sk') * 0.4 + (r(s, 'att') >= 10 ? (r(s, 'cmp') / r(s, 'att') - 0.6) * 10 : 0) : 0;
  const rush = r(s, 'ryds') * 0.1 + r(s, 'rtd') * 6 - r(s, 'fuml') * 3 + r(s, 'brk') * 0.3;
  const rec = r(s, 'recyds') * 0.1 + r(s, 'rectd') * 6 + r(s, 'rec') * 0.5 - r(s, 'drops') * 0.5;
  const def = r(s, 'tkl') * 0.6 + r(s, 'tfl') + r(s, 'sacks') * 3 + r(s, 'dint') * 7.5 + r(s, 'pd') * 1.2 + r(s, 'ff') * 2.5 + r(s, 'fr') * 2 + r(s, 'dtd') * 6 + r(s, 'pres') * 0.3;
  const kick = r(s, 'fgm') * 2 + (r(s, 'fglong') >= 50 ? 2 : 0) - (r(s, 'fga') - r(s, 'fgm')) * 1.5;
  const ret = (r(s, 'krtd') + r(s, 'prtd')) * 6 + (r(s, 'kryds') + r(s, 'pryds')) * 0.03;
  return pass + rush + rec + def + kick + ret;
}

// The one big thing he did, for the headline ("3 TOUCHDOWNS", "2 INTERCEPTIONS", "187 RUSHING YARDS").
export function bigFeat(s) {
  const td = r(s, 'ptd') + r(s, 'rtd') + r(s, 'rectd') + r(s, 'dtd') + r(s, 'krtd') + r(s, 'prtd');
  const opts = [
    [r(s, 'dint') >= 2 ? 100 + r(s, 'dint') : 0, `${r(s, 'dint')} INTERCEPTIONS`], [r(s, 'sacks') >= 2 ? 90 + r(s, 'sacks') : 0, `${r(s, 'sacks')} SACKS`],
    [td >= 3 ? 80 + td : 0, `${td} TOUCHDOWNS`], [r(s, 'pyds') >= 300 ? 70 : 0, `${r(s, 'pyds')} PASSING YARDS`], [r(s, 'ryds') >= 100 ? 75 : 0, `${r(s, 'ryds')} RUSHING YARDS`],
    [r(s, 'recyds') >= 100 ? 74 : 0, `${r(s, 'recyds')} RECEIVING YARDS`], [r(s, 'dtd') ? 95 : 0, 'DEFENSIVE TOUCHDOWN'], [r(s, 'krtd') + r(s, 'prtd') ? 85 : 0, 'RETURN TOUCHDOWN'],
    [r(s, 'fgm') >= 4 ? 60 : 0, `${r(s, 'fgm')} FIELD GOALS`], [td === 2 ? 50 : 0, '2 TOUCHDOWNS'], [r(s, 'pyds') ? 20 : 0, `${r(s, 'pyds')} PASSING YARDS`],
    [r(s, 'ryds') > r(s, 'recyds') ? 15 : 0, `${r(s, 'ryds')} RUSHING YARDS`], [r(s, 'recyds') ? 14 : 0, `${r(s, 'recyds')} RECEIVING YARDS`], [r(s, 'tkl') ? 10 : 0, `${r(s, 'tkl')} TACKLES`],
  ];
  return opts.filter(([w]) => w > 0).sort((a, b) => b[0] - a[0])[0]?.[1] || 'GAME CHANGER';
}

// His line in one row: whichever parts of the game he played.
export function statLine(s) {
  const out = [];
  if (r(s, 'att')) out.push(`${r(s, 'cmp')}/${r(s, 'att')}`, `${r(s, 'pyds')} pass yds`, `${r(s, 'ptd')} TD`, ...(r(s, 'int') ? [`${r(s, 'int')} INT`] : []));
  if (r(s, 'car') >= 3) out.push(`${r(s, 'car')} car`, `${r(s, 'ryds')} rush yds`, ...(r(s, 'rtd') ? [`${r(s, 'rtd')} rush TD`] : []));
  if (r(s, 'rec')) out.push(`${r(s, 'rec')} rec`, `${r(s, 'recyds')} rec yds`, ...(r(s, 'rectd') ? [`${r(s, 'rectd')} rec TD`] : []));
  if (r(s, 'tkl') || r(s, 'sacks') || r(s, 'dint')) out.push(`${r(s, 'tkl')} tkl`, ...(r(s, 'sacks') ? [`${r(s, 'sacks')} sacks`] : []), ...(r(s, 'dint') ? [`${r(s, 'dint')} INT`] : []), ...(r(s, 'pd') ? [`${r(s, 'pd')} PD`] : []));
  if (r(s, 'fga')) out.push(`${r(s, 'fgm')}/${r(s, 'fga')} FG`);
  return out.join(' · ');
}

// rows: [{ player_id, team_id, stats }]. winner: the winning team's id. Returns the row, his score and the headline.
export function playerOfGame(rows, winner) {
  const best = rows.map((x) => ({ ...x, score: gameScore(x.stats) * (x.team_id === winner ? 1.15 : 1) })).sort((a, b) => b.score - a.score)[0];
  return best ? { ...best, feat: bigFeat(best.stats), line: statLine(best.stats) } : null;
}
