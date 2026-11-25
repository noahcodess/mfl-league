// Draft board order: prospects ranked by their public college grade (from last season's stats), best first.
export function collegeGrade(p) {
  const g = Number(p.collegeStats?.grade);
  return Number.isFinite(g) ? g : (p.stars || 1) * 20;   // an old class with no grade falls back to his rating today
}

// id -> board rank (1 = top of the board). Ties go to the steadier id order so everyone sees the same board.
export function boardRanks(prospects) {
  const list = [...(prospects || [])].sort((a, b) => collegeGrade(b) - collegeGrade(a) || String(a.id).localeCompare(String(b.id)));
  return Object.fromEntries(list.map((p, i) => [p.id, i + 1]));
}
