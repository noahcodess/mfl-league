// Draws one frame of the award show for a slide at time t: the camera move, the light (coming up, spotlights onto the
// winner, the house lamps), what the big screen says, the nominees walking on and the winner stepping up, the pixel
// graphic behind them with the award and winner titles, the closing winners card, and the fade back to the plain stage.
import { renderStage, camLerp, easeIO } from './stageView.js';
import { drawNominees, drawPlates } from './stageActors.js';
import { drawPanel, title, PANEL } from './showPanel.js';
import { MARKS } from './stageArt.js';
import { byKey } from './awardRank.js';

const ease = (x) => easeIO(x);
const camDur = (sl) => (sl.kind === 'tonight' ? sl.len : sl.kind === 'lights' ? 1 : Math.min(3, sl.len - 0.6));

function lightFor(sl, t) {
  if (sl.light === 'up') return { level: ease((t - 0.6) / 4.6), lamps: ease(t / 2.2), beams: ease((t - 3.2) / 2), dark: 0.5 };
  if (sl.light === 'house') return { level: 1, lamps: 1, dark: 0.4, audience: 1.6 };
  if (sl.light === 'finale') return { level: 1, lamps: 1, dark: 0.38 };
  if (sl.light === 'close') return { level: 1, lamps: 1 - ease(t / 3), dark: 0.42 + 0.06 * ease(t / 3) };
  if (sl.light === 'winner') {
    const dim = t < 1.2 ? 0.85 * ease(t / 1.2) : 0.85 - 0.45 * ease((t - 1.6) / 1);
    if (sl.game) return { level: 1, lamps: 0.5, dark: 0.5, dim };
    const x = MARKS[sl.win] + (160 - MARKS[sl.win]) * ease((t - 1.3) / 0.8);
    return { level: 1, lamps: 0.5, dark: 0.5, dim, focus: { x, y: 124, k: ease((t - 0.3) / 1) } };
  }
  return { level: 1, lamps: 0.7, dark: 0.5, beams: sl.screen === 'list' || sl.game ? 0.45 : 0.8 };
}

function screenFor(sl, t, info) {
  const d = { season: info.season, count: info.order.length, names: info.names, lines: sl.lines, sub: sl.kind === 'nominees' ? 'AND THE FINALISTS ARE' : sl.kind === 'winner' ? 'AND THE WINNER IS' : '' };
  if (sl.screen === 'games') { d.games = (sl.onStage || []).map((g) => g.name); d.win = sl.kind === 'winner' && t > 2 ? sl.win : null; }
  const p = { title: (t - 1.4) / 4, tonight: t / 3, list: (t - 1.2) / 3.2, award: t / 1.5, games: t / 2 }[sl.screen] ?? 1;
  return { mode: sl.screen, d, p };
}

function logoRow(ctx, xf, logos, teams, wx, wy, size, alpha) {   // team logos drawn crisp at screen resolution
  const { s, X, Y } = xf;
  teams.forEach((id, i) => { const img = logos[id]; if (!img?.complete || !img.width) return; ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, X(wx + (i - (teams.length - 1) / 2) * size * 1.25) - (size * s) / 2, Y(wy) - (size * s) / 2, size * s, size * s); ctx.restore(); });
}

function titles(ctx, xf, sl, t, k, cast) {
  const a = byKey[sl.key], name = a?.name || '';
  if (sl.kind === 'card') {
    title(ctx, xf, 'THE FINALISTS', 160, 38, 3.6, { weight: 700, alpha: k, spacing: 1.2 });
    title(ctx, xf, name.toUpperCase(), 160, 48.5, 8.5, { gold: true, alpha: k, maxW: 172 });
    if (sl.game) (sl.onStage || []).forEach((g, i) => { const gm = cast.games?.[g.id] || {}; logoRow(ctx, xf, cast.logos, [gm.away, gm.home].filter(Boolean), 160, 68 + i * 19 - 8, 9, k); title(ctx, xf, `${g.name} · ${g.line || ''}`, 160, 76 + i * 19 - 4, 4, { weight: 700, alpha: k }); });
  } else if (sl.kind === 'winner') {
    const w = sl.winner || {};
    title(ctx, xf, name.toUpperCase(), 160, 35.5, 4.2, { gold: true, alpha: k, spacing: 0.7, maxW: 172 });
    title(ctx, xf, w.name, 160, 44.5, sl.game ? 9 : 9.5, { alpha: k, maxW: 172 });
    if (sl.game) { const gm = cast.games?.[w.id] || {}; logoRow(ctx, xf, cast.logos, [gm.away, gm.home].filter(Boolean), 160, 82, 22, k); title(ctx, xf, w.line, 160, 106, 5, { weight: 700, alpha: k }); }
    else title(ctx, xf, [w.pos, cast.teamName(w.team)].filter((v, i, x) => v && x.indexOf(v) === i).join(' · '), 160, 52.5, 3.6, { weight: 700, alpha: k, maxW: 172 });
  }
}

// stills: { house, stage } from buildStill. sl: a slide. cast: { nominees: key -> [makeNominee], logos: teamId -> Image,
// teamName(id) }. info: { season, order, names, winners }. off: a spare canvas the size of ctx's (for the closing fade).
export function drawShowFrame(ctx, stills, sl, t, cast, info, off) {
  const cam = camLerp(sl.cam[0], sl.cam[1], ease(t / camDur(sl))), noms = cast.nominees[sl.key] || [];
  const panelK = sl.kind === 'card' ? ease((t - 0.4) / 0.7) * (1 - ease((t - 4.1) / 0.6)) : sl.kind === 'winner' ? ease((t - 2.4) / 0.7) : sl.kind === 'finale' ? ease((t - 0.6) / 0.8) : 0;
  const kind = sl.kind === 'nominees' ? 'enter' : sl.kind === 'winner' ? 'winner' : 'stand', showNoms = !sl.game && noms.length && ['nominees', 'card', 'winner'].includes(sl.kind);
  const actorsOnTop = panelK > 0;
  let places = null;
  const clap = sl.kind === 'tonight' ? ease((t - 0.4) / 0.6) * (1 - ease((t - 5.6) / 0.8)) : sl.kind === 'winner' ? ease((t - 2) / 0.4) * (1 - ease((t - 5) / 1)) : sl.kind === 'finale' ? 1 - ease((t - 5) / 1.5) : 0;
  renderStage(ctx, stills.house, cam, t + (info.clock || 0), {
    screen: screenFor(sl, t, info), light: lightFor(sl, t), clap: clap * (sl.clap || 0),
    actors: showNoms && !actorsOnTop ? (c) => { places = drawNominees(c, noms, t, kind, sl.win); return places; } : null,
    plates: (c, xf) => {
      if (panelK > 0) { c.save(); c.setTransform(xf.s, 0, 0, xf.s, xf.ox, xf.oy); drawPanel(c, panelK); if (showNoms) places = drawNominees(c, noms, t, kind, sl.win); c.restore(); }
      if (showNoms && places && sl.kind !== 'winner') drawPlates(c, noms, places, xf, null, 1);
      if (showNoms && places && sl.kind === 'winner' && t < 2.4) drawPlates(c, noms, places, xf, sl.win, 1 - ease((t - 1.2) / 0.4));
      titles(c, xf, sl, t, panelK, cast);
      if (sl.kind === 'finale') finaleCard(c, xf, info, panelK);
    },
  });
  if (sl.kind === 'close' && off) {   // the auditorium fades back to the plain stage
    const k = ease((t - 0.6) / 2.6); if (k <= 0) return;
    renderStage(off.getContext('2d'), stills.stage, { x: 160, y: 75, z: 1.28 }, t, { screen: screenFor(sl, t, info), light: { dark: 0.46, beams: 0.9 } });
    ctx.save(); ctx.globalAlpha = k; ctx.drawImage(off, 0, 0); ctx.restore();
  }
}

function finaleCard(ctx, xf, info, k) {
  if (k <= 0) return;
  title(ctx, xf, `SEASON ${info.season} AWARD WINNERS`, 160, PANEL.y + 11, 6.5, { gold: true, alpha: k, spacing: 0.6 });
  info.order.forEach((key, i) => {
    const w = info.winners[key]?.[0], y = PANEL.y + 25 + i * 11.5;
    title(ctx, xf, (byKey[key]?.name || '').toUpperCase(), 160, y, 3.1, { gold: true, weight: 700, alpha: k * ease(k * 6 - i * 0.6), spacing: 0.5 });
    title(ctx, xf, w?.name || '-', 160, y + 4.6, 5, { alpha: k * ease(k * 6 - i * 0.6) });
  });
}
