// Which league moment the Live tab shows right now, from the phase, the offseason step and the draft room.
// Offseason steps: 0 = Birthday & Farewell is next, 1 = it just happened, 2 = re-signing, 3 = free agency (draft night
// happens in here), 4 = draft done, training camp is next.

export const STAGES = {
  birthday_soon: { icon: '🎂', title: 'Birthday & Farewell is coming', next: 'birthday' },
  birthday: { icon: '🎂', title: 'Birthday & Farewell', next: 'resign' },
  resign: { icon: '✍️', title: 'Re-signing window', next: 'fa_open' },
  fa: { icon: '💰', title: 'Free agency', next: 'draft' },
  draft: { icon: '🏈', title: 'Draft night', next: 'camp' },
  camp: { icon: '🏋️', title: 'Training camp', next: 'season_start' },
  season: { icon: '🏟️', title: 'Regular season', next: 'trade_deadline' },
};

// draft = { status } from the draft room (or null), draftAt = scheduled draft night ISO time, now = ms.
export function liveStage({ phase, step, draft, draftAt, roomOpensMin = 15, now = Date.now() }) {
  if (phase === 'regular_season') return 'season';
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
