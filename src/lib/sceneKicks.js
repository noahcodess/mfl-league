// Scenes for the plays that aren't a normal snap: kickoffs, punts, field goals and extra points, kneel-downs and flags
// before the snap. Plus buildScene, which picks the right scene for any play report.
import { newScene, add, go, stay, pose, hold, fly, lineUp, buildRun, buildPass, carryOut, yps } from './sceneBuild.js';

const ev = (play, type) => play.events.find((e) => e.type === type);
const row = (S, players, side, along, idle) => players.filter(Boolean).map((p, i, list) => add(S, p, side, along, -18 + (36 * i) / Math.max(1, list.length - 1), idle));

// A returner fielding a kick and bringing it back, with the coverage closing on him.
function bringBack(S, play, ret, land, yards, cover, tLand) {
  const td = play.result.td, end = td ? land - yards - 4 : land - yards, t = tLand + Math.max(0.5, Math.abs(yards) / (yps(ret.p) * 0.92));
  hold(S, tLand, ret); go(ret, t, end, ret.keys[0].y * 0.3, S);
  cover.forEach((c, i) => { stay(c, S.T0 + 0.3); go(c, t, end - 1 - (i % 3) * 2, (i - cover.length / 2) * 2.2, S); });
  if (td) pose(ret, t, t + 9, 'cheer'); else { ret.down = t; if (cover[0]) cover[0].down = t + 0.05; }
  return t;
}

function kickoffScene(S, play, L) {
  const k = L[play.off].kickTeams.kickoff, r = L[play.def].kickTeams.kickReturn, a = play.after;
  S.los = play.off === 'away' ? 35 : 65; S.first = null; S.T0 = 1;
  const endAbs = a.poss === 'away' ? a.ballOn : 100 - a.ballOn, endAlong = (endAbs - S.los) * S.dir, re = ev(play, 'ret');
  const kicker = add(S, k.players[0], play.off, -4, -1), cover = row(S, k.players.slice(1), play.off, -1), ret = add(S, r.returner, play.def, 60, 0);
  row(S, r.players.slice(1, 7), play.def, 34).forEach((b) => { stay(b, S.T0 + 2); go(b, S.T0 + 4, 40, b.keys[0].y * 0.6, S); pose(b, S.T0 + 3, 9, 'block'); });
  go(kicker, S.T0, -0.5, 0, S); pose(kicker, S.T0, S.T0 + 0.4, 'kick'); S.ball.push({ t: 0, kind: 'ground', x: S.los, y: 0 });
  if (play.onside) { fly(S, S.T0, S.T0 + 1.2, [S.los, 0], S.at(11, 3), 1); cover.forEach((c) => { stay(c, S.T0); go(c, S.T0 + 1.6, 10, c.keys[0].y * 0.2, S); }); return S.T0 + 2.4; }
  const land = re ? endAlong + re.yards : 68, tLand = S.T0 + 3.2;
  if (ret) { ret.keys[0].x = S.at(land, 0)[0]; ret.keys[0].y = (play.n % 3 - 1) * 6; }
  fly(S, S.T0, tLand, [S.los, 0], S.at(land, ret ? ret.keys[0].y : 0), 13);
  if (!re || !ret) { cover.forEach((c) => { stay(c, S.T0); go(c, tLand, 30, c.keys[0].y, S); }); return tLand + 0.6; }
  return bringBack(S, play, ret, land, re.yards, cover, tLand);
}

function puntScene(S, play, L) {
  const k = L[play.off].kickTeams.punt, r = L[play.def].kickTeams.puntReturn, kick = ev(play, 'kick'), re = ev(play, 'ret');
  const punter = add(S, k.players[0], play.off, -13, 0), cover = row(S, k.players.slice(1), play.off, -1, 'set'); row(S, r.players.slice(1, 7), play.def, 1.2, 'set');
  const land = Math.min(kick?.dist ?? 42, 100 - play.before.ballOn + 6), ret = add(S, r.returner, play.def, land, 2), tKick = S.T0 + 1.3, tLand = tKick + 3.4;
  S.ball.push({ t: 0, kind: 'ground', x: S.los, y: 0 }); fly(S, S.T0, S.T0 + 0.6, [S.los, 0], S.at(-12.5, 0), 1.5); hold(S, S.T0 + 0.6, punter);
  pose(punter, tKick, tKick + 0.4, 'kick'); fly(S, tKick, tLand, S.at(-12.5, 0), S.at(land, 2), 15);
  if (re && !re.fair && ret) return bringBack(S, play, ret, land, re.yards, cover, tLand);
  cover.forEach((c) => { stay(c, tKick); go(c, tLand, land - 3, c.keys[0].y * 0.4, S); });
  if (ret && re?.fair) { pose(ret, tLand - 0.6, tLand + 1, 'catch'); hold(S, tLand, ret); } else S.ball.push({ t: tLand, kind: 'ground', x: S.at(land + 4, 2)[0], y: 2 });
  return tLand + 0.5;
}

function kickScene(S, play, L) { // field goals and extra points
  const u = L[play.off].kickTeams.fieldGoal, kick = ev(play, 'kick'), goalAbs = play.off === 'away' ? 100 : 0;
  if (play.kind === 'xp') S.los = goalAbs - S.dir * 15;
  S.first = null;
  const holder = add(S, u.holder || u.players[1], play.off, -7, 0, 'set'), kicker = add(S, u.kicker, play.off, -9.5, -2);
  row(S, u.players.slice(2), play.off, -0.8, 'set').forEach((a, i, l) => { a.keys[0].y = -6 + (12 * i) / Math.max(1, l.length - 1); pose(a, S.T0, 9, 'block'); });
  row(S, L[play.def].kickTeams.fieldGoalBlock.players.slice(0, 8), play.def, 1, 'set').forEach((a, i, l) => { a.keys[0].y = -6 + (12 * i) / Math.max(1, l.length - 1); pose(a, S.T0, 9, 'block'); });
  const tKick = S.T0 + 1.1, toPosts = (goalAbs - S.los) * S.dir + 10, tEnd = tKick + 1 + toPosts / 30;
  S.ball.push({ t: 0, kind: 'ground', x: S.los, y: 0 }); fly(S, S.T0, S.T0 + 0.4, [S.los, 0], S.at(-6.8, 0), 0.6); if (holder) hold(S, S.T0 + 0.4, holder);
  if (kicker) { stay(kicker, S.T0 + 0.4); go(kicker, tKick, -7.6, -0.4, S); pose(kicker, tKick, tKick + 0.4, 'kick'); }
  fly(S, tKick, tEnd, S.at(-6.8, 0), S.at(toPosts + 2, kick?.good ? 0.5 : 6.5), 9);
  return tEnd + 0.3;
}

// lineups: { home, away } from loadLineups. Returns the scene: actors with their moves, the ball's story, and how long it runs.
export function buildScene(play, lineups) {
  const S = newScene(play, lineups); let tEnd;
  if (play.kind === 'kickoff') tEnd = kickoffScene(S, play, lineups);
  else if (play.kind === 'punt') tEnd = puntScene(S, play, lineups);
  else if (play.kind === 'fg' || play.kind === 'xp') tEnd = kickScene(S, play, lineups);
  else {
    lineUp(S);
    const made = play.events.find((e) => e.type === 'tackle' && e.result === 'made');
    const gain = play.kind === 'two' ? (play.headline === '2-PT GOOD' ? 3.5 : 1) : play.flagged ? (made?.at ?? 0) : play.result.gain;
    if (play.kind === 'penalty') { const who = S.by[ev(play, 'flag')?.on]; if (who) { stay(who, 0.6); go(who, 0.9, (who.side === play.off ? 0.6 : -0.6) + (who.keys[0].x - S.los) * S.dir, who.keys[0].y, S); who.idle = 'stand'; } S.flag = { t: 1 }; tEnd = 1.6; }
    else if (play.kind === 'kneel') { hold(S, S.T0, S.A.QB); S.A.QB.down = S.T0 + 0.5; tEnd = S.T0 + 1; }
    else if (play.events.some((e) => e.type === 'throw' || (e.type === 'pressure' && e.kind === 'sack'))) tEnd = buildPass(S, gain);
    else tEnd = buildRun(S, gain);
    if (play.flagged) S.flag = { t: tEnd };
  }
  S.tEnd = tEnd; S.dur = tEnd + (play.result.td ? 2.4 : play.headline ? 1.6 : 1);
  return S;
}
export { carryOut };
