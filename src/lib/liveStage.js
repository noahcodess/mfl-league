// Which league moment the Live tab shows right now, from the phase, the offseason step and the draft room.
// Offseason steps: 0 = Birthday & Farewell is next, 1 = it just happened, 2 = re-signing, 3 = free agency (draft night
// happens in here), 4 = draft done, training camp is next.

export const STAGES = {
  birthday_soon: { icon: '🎂', title: 'Birthday & Farewell is coming', next: 'birthday' },
  birthday: { icon: '🎂', title: 'Birthday & Farewell', next: 'resign' },
  resign: { icon: '✍️', title: 'Re-signing window', next: 'fa_open' },
  fa: { icon: '💰', title: 'Free agency', next: 'draft' },
  draft: { icon: '🏈', title: 'Draft night', next: 'camp' },
  camp: { icon: '🏟️', title: 'Preseason', next: 'season_start' },
  season: { icon: '🏟️', title: 'Regular season', next: 'trade_deadline' },
  awards: { icon: '🏅', title: 'Award Ceremony', next: 'playoffs' },
  playoffs: { icon: '🏆', title: 'Playoffs', next: null },
};

// draft = { status } from the draft room (or null), draftAt = scheduled draft night ISO time, now = ms.
// week: the league's saved week (13 = the award ceremony, its own moment; 14-16 = the playoffs).
export function liveStage({ phase, step, draft, draftAt, week = 0, roomOpensMin = 15, now = Date.now() }) {
  if (phase === 'regular_season') return week >= 14 ? 'playoffs' : week > 12 ? 'awards' : 'season';
  if (step === 0) return 'birthday_soon';
  if (step === 1) return 'birthday';
  if (step === 2) return 'resign';
  if (step === 3) {
    const roomOpen = draftAt && Date.parse(draftAt) - now <= roomOpensMin * 60e3;
    if (draft && draft.status !== 'done') return 'draft';
    if (roomOpen) return 'draft';
    return 'fa';
  }
  return 'camp';
}
