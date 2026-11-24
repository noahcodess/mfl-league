// Draws one frame of the award show for a slide at time t: the camera (from wherever it was, through the slide's
// keyframes), the light (coming up over the house, dropping for the drum roll while spotlights hunt across the
// finalists, locking onto the winner), the big screen, the nominees, the clapping house, confetti, and the fade back
// to the plain stage at the end.
import { renderStage, easeIO } from './stageView.js';
import { drawNominees, drawPlates } from './stageActors.js';
import { drawConfetti } from './showConfetti.js';
import { camAt, HIT, DRUM_AT, CAMS } from './showSlides.js';
import { MARKS } from './stageArt.js';

const ease = easeIO, k01 = (x) => Math.min(1, Math.max(0, x));

function lightFor(sl, t, winX) {
  if (sl.kind === 'opening') return { level: 0.3 + 0.7 * ease((t - 1.5) / 5.5), lamps: ease((t - 3) / 3), beams: ease((t - 4.5) / 2.5), dark: 0.5, audience: 0.9 };
  if (sl.kind === 'tonight' || sl.kind === 'finale') return { level: 1, lamps: 1, dark: 0.42, audience: 1.15 };
  if (sl.kind === 'close') return { level: 1, lamps: 1 - ease(t / 3), dark: 0.44 };
  if (sl.kind === 'reveal') {
    const dim = t < HIT ? 0.85 * ease(t / DRUM_AT) : 0.85 - 0.6 * ease((t - HIT - 0.4) / 1.6);
    if (sl.game) return { level: 1, lamps: 0.4, dark: 0.5, dim, beams: 0.6 };
    const hunt = 160 + Math.sin((t - DRUM_AT) * 4.2) * 30 * (1 - ease((t - HIT + 0.6) / 0.6));   // the spotlights hunt, then land
    const walk = winX + (160 - winX) * ease((t - HIT) / 0.9);   // he steps to the front after the reveal
    const x = t < HIT - 0.6 ? hunt : hunt + (walk - hunt) * ease((t - HIT + 0.6) / 0.6), y = 124 + 5 * ease((t - HIT) / 0.9);
    return { level: 1, lamps: 0.4, dark: 0.5, dim, focus: { x, y, k: ease((t - DRUM_AT) / 0.8) } };
  }
  return { level: 1, lamps: 0.7, dark: 0.5, beams: sl.kind === 'finalists' ? 0.7 : 0.45 };
}

function rowFor(e, sl, cast) {
  if (!e) return null;
  if (sl.game) {
    const g = cast.games?.[e.id] || {}, m = /(\d+)\s*-\s*(\d+)/.exec(e.line || ''), wk = /week\s*(\d+)/i.exec(e.line || '');
    const score = g.home != null ? `${g.as} – ${g.hs}` : m ? `${m[1]} – ${m[2]}` : '';
    return { game: true, away: g.away, home: g.home, score, name: e.name, when: `WEEK ${g.week ?? wk?.[1] ?? '?'}${/ot/i.test(e.line || '') ? ' · OVERTIME' : ''}` };
  }
  const sub = sl.key === 'coy' ? [cast.teamName(e.team), e.line] : [e.pos, cast.teamName(e.team), e.line];
  return { name: e.name, team: e.team, sub: sub.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') };
}

function screenFor(sl, t, info, cast) {
  const d = { season: info.season, count: info.order.length, names: info.names, lines: sl.lines, lead: sl.lead, title: sl.title, logos: cast.logos };
  if (sl.screen === 'finalists') return { mode: 'finalists', d: { ...d, rows: (sl.onStage || []).map((e) => rowFor(e, sl, cast)) }, p: (t - 1.2) / 2.4 };
  if (sl.screen === 'reveal') return t < HIT ? { mode: 'drum', d, p: (t - DRUM_AT) / 1 } : { mode: 'winner', d: { ...d, winner: rowFor(sl.winner, sl, cast) }, p: (t - HIT) / 1.2 };
  if (sl.screen === 'winners') return { mode: 'winners', d: { ...d, list: info.order.map((k) => ({ award: info.short[k].toUpperCase(), name: info.winners[k]?.[0]?.name || '-' })) }, p: (t - 0.8) / 3 };
  const p = { title: (t - 2) / 4, tonight: (t - 0.6) / 2.4, list: (t - 1.6) / 3, intro: t / 1.4 }[sl.screen] ?? 1;
  return { mode: sl.screen, d, p };
}

// stills: { house, stage } from buildStill. cast: { nominees, logos, games, teamName }. info: { season, order, names,
// short, winners, theme }. start: the camera when the slide began. off: a spare canvas (the closing fade). Returns the camera.
export function drawShowFrame(ctx, stills, sl, t, cast, info, start, off) {
  const cam = camAt(sl, t, start, ease), noms = cast.nominees[sl.key] || [], people = !sl.game && noms.length;
  const kind = sl.kind === 'finalists' ? 'enter' : sl.kind === 'reveal' ? 'reveal' : 'stand';
  const showNoms = people && (sl.kind === 'finalists' || sl.kind === 'reveal'), winX = MARKS[sl.win] ?? 160;
  const clap = sl.kind === 'tonight' ? k01((t - 0.6) / 0.6) * (1 - k01((t - 5.4) / 0.6)) : sl.kind === 'reveal' ? k01((t - HIT - 0.2) / 0.3) * (1 - k01((t - 8) / 1)) : sl.kind === 'finale' ? 1 - k01((t - 5.5) / 1.5) : 0;
  let places = null;
  renderStage(ctx, stills.house, cam, t + (info.clock || 0), {
    theme: info.theme, screen: screenFor(sl, t, info, cast), light: { ...lightFor(sl, t, winX), screenRgb: info.theme.rgb }, clap: clap * (sl.clap || 0),
    actors: showNoms ? (c) => { places = drawNominees(c, noms, t, kind, sl.win, HIT); return places; } : null,
    plates: (c, xf) => {
      if (showNoms && places && (sl.kind === 'finalists' || t < HIT - 1)) drawPlates(c, noms, places, xf, sl.kind === 'reveal' ? 1 - k01((t - DRUM_AT) / 0.6) : 1);
      if (sl.kind === 'reveal') drawConfetti(c, t - HIT - 0.1, info.theme.confetti);
      if (sl.kind === 'finale') drawConfetti(c, t - 0.4, info.theme.confetti);
    },
  });
  if (sl.kind === 'close' && off) {   // the auditorium fades back to the plain stage
    const k = ease((t - 0.8) / 2.8);
    if (k > 0) {
      renderStage(off.getContext('2d'), stills.stage, CAMS.live, t, { theme: info.theme, screen: { mode: 'after', d: { season: info.season } }, light: { dark: 0.46, beams: 0.6, screenRgb: info.theme.rgb } });
      ctx.save(); ctx.globalAlpha = k; ctx.drawImage(off, 0, 0); ctx.restore();
    }
  }
  return cam;
}
