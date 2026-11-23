// The pixel broadcast: plays a finished sim back on the stadium field, one play at a time. Players line up, run the play
// the report describes, and the network scorebug follows along. Pause, change speed, or skip ahead. It only shows a game
// the engine already played; nothing here can change what happens.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameField from './GameField.jsx';
import Scorebug from './Scorebug.jsx';
import { broadcastFor } from '../data/broadcast.js';
import { useGameKits } from '../data/gameKits.js';
import { useDrips, helmetDesign } from '../data/drip.js';
import { looksFor } from '../lib/portraitLooks.js';
import { buildOf } from '../lib/fieldSprite.js';
import { buildScene, seek } from '../lib/sceneBuild.js';
import { drawScene } from '../lib/sceneDraw.js';
import { yardX, MID_Y } from '../lib/fieldLayout.js';
import { paceFor, shotsFor, slowAt } from '../lib/pacing.js';
import { clockFace } from '../lib/broadcastClock.js';
import { camTarget } from '../lib/broadcastCam.js';
import NetStinger from './NetStinger.jsx';
import { STING_MID } from '../lib/pixelSwarm.js';
import BroadcastSlot, { slotCard, slotBusy, slotWindow } from './BroadcastSlot.jsx';
import ScoreTakeover from './ScoreTakeover.jsx';
import TimeoutTakeover from './TimeoutTakeover.jsx';
import StadiumPulse from './StadiumPulse.jsx';
import RefCall from './RefCall.jsx';
import { penaltyCall } from '../lib/penaltyCall.js';
import { callStage, callCam, CALL_LEN, CALL_PANEL } from '../lib/refCallShow.js';
import { planGraphics } from '../lib/broadcastGfx.js';
import HalftimeReport from './HalftimeReport.jsx';
import OvertimeRules from './OvertimeRules.jsx';
import QuarterRecap from './QuarterRecap.jsx';
import useBoothRemote from './useBoothRemote.js';
import { finalText } from '../data/gameState.js';
import useCrowdSound from './useCrowdSound.js';
import GameControls from './GameControls.jsx';
import LineupShowcase from './LineupShowcase.jsx';
import { introPlan, introCountdown, introSlides, INTRO_AT, INTRO_LEN, INTRO_T0 } from '../lib/introPlan.js';
import CutShow from './CutShow.jsx';
import { huddleCam, woPulse } from '../lib/whiteoutPlan.js';
import { cutPlan, firstWhiteout, CUT, HUDDLE_CUTS } from '../lib/cutPlan.js';
import InjuryTakeover from './InjuryTakeover.jsx';
import InjuryReport from './InjuryReport.jsx';
import { lineupsAt, injuryCam, reportPlays, INJ_LEN, REPORT_IN, REPORT_LEN } from '../lib/injuryShow.js';

const everyone = (lineups, side) => [...lineups[side].all, ...Object.values(lineups[side].kickTeams).flatMap((u) => u.players)].filter(Boolean);
// One look per player: his Drip tab sprite in this game's uniform, with his face, number, helmet, gear and body size.
function makeLooks(lineups, kits, teams, drips) {
  const out = {};
  for (const side of ['home', 'away']) {
    const kit = kits[side];
    everyone(lineups, side).forEach((p) => {
      if (out[p.id]) return;
      out[p.id] = { key: `${p.id}|${kit.name}|${side}|${drips ? 1 : 0}`, colors: kit.colors, face: looksFor(p), number: p.number ?? 1, drip: drips?.[p.id], design: helmetDesign(teams[side]), ...buildOf(p) };
    });
  }
  return out;
}

// game: a result from playGame. teams: { home, away }. lineups: from useGameLineups. match: the scheduled game (its network and
// uniforms), if it's a real one. full: fills the broadcast screen with the controls on top. onDone: called once the last play is shown.
// startAt: the play to open on (a resumed game). onPlay(i): called as each play starts (saves where a paused game is).
// rec: { teamId: record } for the scorebugs. boothId: links this broadcast to the commissioner's Broadcast Booth window;
// onInput(input): a timeout or test tool from the booth (the game replays from there). sound: the game's crowd, for the
// commissioner's crowd sound (null: silent). Pre-play cutscenes (cutPlan): the Creepers whiteout, a Bloodbath opener and
// the two-minute warning.
export default function PixelGame({ game, teams, lineups, onClose, onDone, onPlay, startAt = 0, match = null, full = false, rec = null, boothId = null, onInput, sound = null }) {
  const [sting, setSting] = useState(0), [i, setI] = useState(startAt), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [beat0, setBeat] = useState({ post: false, phase: 'live', i: startAt });
  const beat = beat0.i === i ? beat0 : { post: false, phase: 'live', i };   // a beat from the last play never leaks into this one (no flash of how this play ends)
  const [brk, setBrk] = useState(null), shownBrk = useRef(new Set());   // a break between plays: 'half' (the halftime report) or 'ot' (the overtime rules), live = covering the field
  const kits = useGameKits(teams.home, teams.away, match), ids = useMemo(() => ['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => p.id)), [lineups]), drips = useDrips(ids);
  const looks = useMemo(() => (kits ? makeLooks(lineups, kits, teams, drips) : {}), [lineups, kits?.home?.name, kits?.away?.name, drips]); // eslint-disable-line react-hooks/exhaustive-deps
  const bc = useMemo(() => broadcastFor(match || { window: null }, teams.home), [match, teams.home]);
  const cuts = useMemo(() => cutPlan(game.plays, teams.home, kits, game.seed || 1), [teams.home, kits?.special, kits?.home?.name, game.plays]), shownCut = useRef(new Set()), cutRun = useRef(null);   // a cutscene, once per play it's planned for
  const intros = useMemo(() => (bc.bug === 'snf' ? introPlan(game.plays, cuts) : {}), [bc.bug, game.plays, cuts]);   // SNF's starting lineup showcases
  const play = game.plays[i], done = i >= game.plays.length, hud = HUDDLE_CUTS.has(cuts[i]), ix = intros[i];
  const pace = useMemo(() => { const pc = play && paceFor(play); return pc && (hud || ix) ? { ...pc, T0: Math.max(pc.T0, ix ? INTRO_T0 : 5.4), huddleD: hud } : pc; }, [play, hud, ix]);   // a stadium cutscene: both teams in a real huddle; a showcase: room before the snap
  const S = useMemo(() => (play ? buildScene(play, lineupsAt(lineups, game.injuries, play.n), pace, game.seed || 1) : null), [play, lineups, pace, game.seed, game.injuries]), shots = useMemo(() => S && shotsFor(S, pace), [S, pace]);
  useEffect(() => { if (done) onDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPlay?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const live0 = useRef(null); useEffect(() => { live0.current = S; }, [S]);   // the play as it's being acted out right now
  const plan = useMemo(() => planGraphics(game.plays), [game.plays]), g = plan[i] || {};
  const callOf = useMemo(() => play && penaltyCall(play, Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, p]))), teams), [play, lineups, teams]);   // the referee's announcement for a flagged play   // every graphic, planned so only one is ever up
  const people = useMemo(() => Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, p]))), [lineups]), playerOf = (id) => people[id];
  const inj = play && game.injuries?.find((x) => x.n === play.n), reps = useMemo(() => reportPlays(game.plays, game.injuries), [game.plays, game.injuries]), rep = reps[i];   // someone hurt on this play; the injury report due on this one
  const sideOf = useMemo(() => Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, s]))), [lineups]);
  const marks = useMemo(() => ({ q1: game.plays.findIndex((p) => p.before.quarter === 2), half: game.plays.findIndex((p) => p.before.quarter === 3), q3: game.plays.findIndex((p) => p.before.quarter === 4), ot: game.plays.findIndex((p) => p.before.quarter >= 5) }), [game.plays]);   // the first snap of the 2nd, the second-half kickoff, the first snap of the 4th, the first overtime snap
  useEffect(() => { const kind = i === marks.half ? 'half' : i === marks.ot ? 'ot' : i === marks.q1 ? 'q1' : i === marks.q3 ? 'q3' : null; if (kind && i > 0 && !shownBrk.current.has(i)) { shownBrk.current.add(i); setBrk({ kind, live: true }); } }, [i, marks]);
  const fresh = i === 0 || i === marks.half || i === marks.ot;   // the scorebug builds in again for these kickoffs
  const jumpTo = (k) => { const q = play?.before.quarter ?? 1, at = k === 'half' ? marks.half : k === 'ot' ? marks.ot : k === 'nextq' ? game.plays.findIndex((p, n) => n > i && p.before.quarter > q) : -1; setI(at > i ? at : game.plays.length); };
  const booth = useBoothRemote({ gameId: boothId, game, i, people, sideOf, act: { setPaused, setSpeed, setI, jumpTo, onInput, preview: (kind) => setBrk({ kind, live: true, at: i }) },
    read: () => ({ i, total: game.plays.length, paused, speed, phase: beat.phase, post: beat.post, t: beat.t ?? 0, T0: S?.T0, tEnd: S?.tEnd, dead: pace?.dead, clock: beat.clock, playClock: beat.playClock, brk: brk?.kind || null,
      play: play && { n: play.n, kind: play.kind, off: play.off, keyPlay: !!play.keyPlay, call: play.call?.name || null, pulse: play.pulse || null, before: play.before, text: beat.post ? play.text : null },
      pre: g.pre ? { id: `pre-${i}`, type: g.pre.type, label: g.pre.type === 'card' ? `${playerOf(g.pre.id)?.name} stat card` : g.pre.type === 'drive' ? 'Drive summary' : g.pre.type === 'fg' ? `Field goal bar (${g.pre.dist} yds)` : 'Ball on tag', window: slotWindow(g.pre, pace) } : null,
      intro: introNow, marks, timeouts: game.timeouts || [], score: (beat.post ? play?.after?.score : play?.before.score) || game.score }) });
  const clock = useRef({ t: 0, last: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0 }), ctl = useRef({}); ctl.current = { inj, speed, paused: paused || !!brk?.live, S, i, shots, pace, sc: g.score, fresh, hold: booth.hold, pz: play?.pulse, tout: !!(game.timeouts || []).find((x) => x.n === i + 1), call: callOf };
  useEffect(() => { Object.assign(clock.current, { t: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0, injDone: false }); setBeat({ post: false, phase: 'live', i }); cutRun.current = null;
    if (cuts[i] && !shownCut.current.has(i)) { shownCut.current.add(i); cutRun.current = { i, kind: cuts[i] }; clock.current.phase = 'cut'; setSting((n) => n + 1); }   // cut away
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const snd = useCrowdSound(sound, game.seed || 1, () => ({ play, S, c: clock.current, brk: !!brk?.live, paused, done, cut: cutRun.current?.i === i ? cutRun.current.kind : null, tout: toutBar, next: game.plays[i + 1] || 'end' }));
  useEffect(() => { // the play clock, scorebug flip and which shot we're in, a few times a second
    const id = setInterval(() => { const { S: s, i: n, pace: pc } = ctl.current, c = clock.current; if (s) setBeat({ i: n, post: c.t >= s.tEnd, t: c.t, tdAt: c.tdAt, phase: c.phase, hold: c.hold, ...clockFace(game, n, c.t, s, c.phase, pc.dead) }); }, 100);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {   // the camera operator (broadcastCam) decides the shot
      const { S: s, shots: sh } = ctl.current, c = clock.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      const cp = c.phase === 'call' && live0.current?.callPose; if (cp) return callCam(cp);
      const hc = c.phase === 'cut' && HUDDLE_CUTS.has(cutRun.current?.kind) && huddleCam(live0.current || s); if (hc) return hc; const ic = /inj$/.test(c.phase) && injuryCam(live0.current, ctl.current.inj?.id); if (ic) return ic;   // the whiteout: tight on the visitors' huddle   // the close-up: the referee in the middle of the screen
      return camTarget(s, live0.current || s, { phase: c.phase, t: c.phase === 'replay' ? c.rt : c.t, slow: slowAt(sh, c.t) < 1, first: ctl.current.fresh, flag: sh?.flag, replay: sh?.replay });
    },
    shake() {   // a loud house shakes the camera before the snap (the graphics don't shake, only the pulse meter)
      const { S: s, pz } = ctl.current, c = clock.current, hit = live0.current?.hit, n0 = performance.now();
      if (hit && c.phase === 'live' && c.t >= hit.t && c.t < hit.t + 0.35) { const k = hit.amp * (1 - (c.t - hit.t) / 0.35); return { dx: Math.sin(n0 / 17) * k, dy: Math.cos(n0 / 23) * k }; }   // a big hit jolts the camera
      if (!s || !pz?.show || c.phase !== 'live' || c.t < 0.6 || c.t > s.T0 + 0.8) return null;
      const a = Math.max(0, (pz.v - 40) / 60) * 1.2, n = performance.now();
      return { dx: Math.sin(n / 31) * a, dy: Math.cos(n / 47) * a * 0.7 };
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p, shots: sh, pace: pc, sc } = ctl.current, dt = c.last ? Math.min(0.1, (now - c.last) / 1000) * sp : 0;
      c.last = now; if (!s || !sh) return;
      const next = (stung) => { if (ctl.current.inj && !c.injDone) { c.injDone = true; c.phase = 'toinj'; c.hold = 0; if (!stung) setSting((n) => n + 1); return; } c.t = 0; c.phase = 'live'; c.hold = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); };   // someone's hurt: the INJURY takeover first
      if (!p && !(ctl.current.hold && c.phase === 'live' && c.t >= s.T0 - 0.5 && c.t < s.T0)) {   // the booth can hold the snap (the play clock stops)
        if ((c.phase === 'sting' || c.phase === 'replay') && !sh.replay) c.phase = 'live';   // jumped to a new play mid-replay (booth skip): pick the new one up live
        const toReplay = () => { c.phase = 'sting'; c.hold = 0; setSting((n) => n + 1); };   // the network transition covers the cut to the replay
        if (c.phase === 'live') { c.t += dt * slowAt(sh, c.t); if (c.t > s.tEnd + pc.dead && (c.tdAt == null || (c.tdReal && now - c.tdReal > (sc?.type === 'fg' ? 3300 : 3700)))) {   // the scoring takeover runs its full length at any speed
          if (sh.flag && ctl.current.call) { c.phase = 'tocall'; c.hold = 0; setSting((n) => n + 1); } else if (sh.replay) toReplay(); else next(); } }   // a flag: transition to the referee's call
        else if (c.phase === 'cut') { const K = CUT[cutRun.current?.kind] || CUT.tmw, h0 = c.hold; c.hold += dt / sp; if (h0 < K.back && c.hold >= K.back) setSting((n) => n + 1); if (c.hold > K.len) { c.phase = 'live'; c.hold = 0; } }   // stadium shot, back to the huddle
        else if (c.phase === 'toinj' || c.phase === 'inj') { c.hold += dt / sp; c.t += dt; if (c.phase === 'toinj' && c.hold > STING_MID / 1000) { c.phase = 'inj'; c.hold = 0; } else if (c.phase === 'inj' && c.hold > INJ_LEN) { setSting((n) => n + 1); next(true); } }   // on him while he's down
        else if (c.phase === 'tocall') { c.hold += dt / sp; if (c.hold > STING_MID / 1000) { c.phase = 'call'; c.hold = 0; } }
        else if (c.phase === 'call') { c.hold += dt / sp; if (c.hold > CALL_LEN) { if (sh.replay) toReplay(); else { setSting((n) => n + 1); next(true); } } }
        else if (c.phase === 'sting') { c.hold += dt; if (c.hold > STING_MID / 1000) { c.phase = 'replay'; c.rt = sh.replay.from; } }
        else if (c.phase === 'replay') { c.rt += dt * sh.replay.speed; if (c.rt > sh.replay.to) { setSting((n) => n + 1); next(true); } }   // and the cut back
      }
      live0.current = seek(live0.current || s, c.phase === 'replay' ? c.rt : c.t);   // step the live play to now (a replay rewinds and replays it)
      const cs = ctl.current.call, R = live0.current.refs?.find((r) => r.code === 'R');
      live0.current.callPose = c.phase === 'call' && cs ? callStage(live0.current, cs, c.hold) : null;   // he walks clear and acts out the call
      if (R && ctl.current.tout && c.phase === 'live' && c.t < 3) { R.sig = 'timeout'; R.sigAt = 0; }   // a timeout: the referee signals it before the snap
      const h = live0.current.ball.holder;   // touchdown: the show starts half a second after he has it in the end zone
      const td = sc?.type === 'td' && sc, way = td && (td.side === s.play.off ? s.dir : -s.dir);   // the end zone the scorer is going for
      if (sc?.type === 'fg' && c.tdAt == null && c.t >= s.tEnd - 0.15) c.tdAt = c.t;   // a good kick: right as it clears the bar
      if (td && c.tdAt == null && c.phase === 'live' && ((h && h.id === td.ids[0] && (way > 0 ? h.x > 100 : h.x < 0)) || c.t >= s.tEnd)) c.tdAt = c.t + (c.t >= s.tEnd ? 0 : 0.5);
      if (c.tdAt != null && !c.tdReal && c.t >= c.tdAt) c.tdReal = now;
      drawScene(ctx, live0.current, cam, looks);
    },
  }), [looks]);
  const introNow = introCountdown(intros, i, clock.current, S, teams, done);
  const gpre = booth.denied.has(`pre-${i}`) ? null : g.pre, man = booth.manual && playerOf(booth.manual.id);   // the commissioner can deny a graphic, or put up a stat card
  const pre = !beat.post && beat.phase === 'live' && !!play, bt = beat.t ?? 0, busy = slotBusy(gpre, pace, bt, pre);
  const card = (man && { side: booth.manual.side, player: man, team: teams[booth.manual.side], lines: booth.manual.lines, out: booth.manual.until - Date.now() < 450 }) || slotCard(gpre, pace, bt, pre, teams, playerOf);   // his card beats the planned one
  const tout = (game.timeouts || []).find((x) => x.n === i + 1), toutUp = tout && pre && bt < 3.7, toutBar = toutUp && bt >= 1.4;   // a timeout as they break the huddle: the bug grows, his light blinks out, then the TIMEOUT bar
  const tos = (side) => { const v = (beat.post ? game.plays[i + 1]?.before.to : play?.before.to)?.[side] ?? 3; return toutUp && tout.side === side && bt < 1.3 ? v + 1 : v; };
  const ck = cutRun.current?.i === i && cutRun.current.kind, pz = HUDDLE_CUTS.has(ck) ? woPulse(play?.pulse, sound, ck === 'bb' || firstWhiteout(cuts, i)) : play?.pulse, t0 = S?.T0 ?? 0, pzHit = pz?.hit && beat.post && bt < (S?.tEnd ?? 0) + 3.2;   // Stadium Pulse: up before the snap (and after, when the noise caused it)
  const te = S?.tEnd ?? 0, pzAfter = pz?.after != null && !pzHit && beat.post && bt > te + 0.5 && bt < te + 3.6;   // and right after a big stop by the home defense
  const pzUp = beat.phase === 'live' && ((!!pz?.show && ((bt >= 0.6 && bt < t0 + 1.1) || pzHit)) || pzAfter), pzOut = pzAfter ? bt > te + 3.2 : !pzHit && bt > t0 + 0.75;
  const scoreUp = !!g.score && beat.phase === 'live' && beat.tdAt != null && bt >= beat.tdAt;   // the scoring takeover of the bug
  const bugUp = !brk?.live && (!fresh || done || bt >= (S?.T0 ?? 0));   // the scorebug builds in as the opening (and second-half, and overtime) kickoff is struck
  const b4 = play && { quarter: play.before.quarter, clock: play.before.clock, score: play.before.score, poss: play.kind === 'kickoff' ? play.def : play.off,
    down: ['kickoff', 'xp', 'two'].includes(play.kind) ? null : play.before.down, toGo: play.before.toGo, ballOn: play.before.ballOn };   // before the snap
  const aft = (p) => ({ quarter: p.before.quarter, clock: p.before.clock, ...p.after });   // a try's after holds only the score: keep its quarter and clock
  const a = done ? aft(game.plays[game.plays.length - 1]) : beat.post ? aft(play) : b4;
  const dn = !done && beat.post && bt < (S?.tEnd ?? 0) + 1 ? b4 : a;   // down and distance turn over about a second after the whistle
  const ticking = !done && beat.clock != null, clk = ticking ? beat.clock : a.clock;
  const flagUp = !!callOf && !!S?.flag && (beat.phase === 'live' || beat.phase === 'tocall') && bt >= S.flag.t + 1 + ((play.n * 37) % 50) / 100;   // FLAG on the scorebug 1-1.5 s after it's thrown
  const st = { flag: flagUp, status: done ? 'final' : 'live', quarter: a.quarter, clock_left: Math.max(0, Math.ceil(clk)), clock_running: ticking && beat.running, home_score: a.score.home, away_score: a.score.away, home_timeouts: tos('home'), away_timeouts: tos('away'),
    possession: done ? null : teams[dn.poss]?.id, try: !done && dn === b4 && play?.kind === 'xp' ? 'PAT' : !done && dn === b4 && play?.kind === 'two' ? '2-PT Try' : null, down: dn.down, togo: dn.toGo, ball_on: dn.ballOn, play_clock: booth.hold && booth.pc != null ? booth.pc : beat.playClock ?? 24 };
  return (
    <div className={`pg-wrap${full ? ' pg-full' : ''}`}>
      <div className="pg" data-kind={play?.kind}>
        <GameField team={teams.home} live={live} crowd={kits?.fans || 'normal'} />
        {beat.post && beat.phase === 'live' && play?.headline && play.headline !== 'FLAG' && !g.score && <div className="pg-headline" key={i}>{play.headline}</div>}
        {beat.phase === 'replay' && <div className={`pg-replay net-${bc.net.key}`}><b>REPLAY</b></div>}
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        {beat.phase === 'call' && callOf && beat.hold > CALL_PANEL && <RefCall key={`rc${i}`} call={callOf} />}
        {rep && beat.phase === 'live' && bt >= REPORT_IN && bt < REPORT_IN + REPORT_LEN && <InjuryReport key={`ir${i}`} x={rep} n={i + 1} player={playerOf(rep.id)} sub={playerOf(rep.sub)} team={teams[rep.side]} bug={bc.bug} week={match?.week ?? null} out={bt > REPORT_IN + REPORT_LEN - 0.5} />}
        {beat.phase === 'cut' && <CutShow kind={ck} hold={beat.hold} teams={teams} play={play} bc={bc} v={pz?.v ?? 90} crowd={sound} kits={kits} />}
        {!beat.post && beat.phase !== 'cut' && pace?.keyPlay && !busy && <div className="pg-key">KEY PLAY</div>}
        {done && <div className="pg-headline final">{finalText(4 + (game.overtimes || 0)).toUpperCase()}</div>}
        {ix && pre && bt >= INTRO_AT && bt < INTRO_AT + INTRO_LEN && <LineupShowcase x={ix} team={teams[ix.side]} slides={introSlides(lineupsAt(lineups, game.injuries, play.n)[ix.side], ix.unit)} playerOf={playerOf} t={bt - INTRO_AT} />}
        <BroadcastSlot pre={ix ? null : gpre} pace={pace} bt={bt} live={pre} play={play} teams={teams} bug={bc.bug} playerOf={playerOf} n={i} />
        {pzUp && !brk?.live && <StadiumPulse key={`sp${i}${pzAfter ? 'a' : ''}`} v={pzAfter ? pz.after : pz.v} net={bc.net.key} hit={pz.hit && beat.post} run={pz.run} out={pzOut} />}
        {bugUp && <div className="pg-shelf" />}
        {brk && (() => {   // the break plays at its mark, or wherever the booth previews it (at)
          const at = brk.at ?? marks[brk.kind], p0 = game.plays[Math.min(at, game.plays.length - 1)], ends = { onReveal: () => setBrk((b) => b && { ...b, live: false }), onDone: () => setBrk(null) };
          const film = { lineups, looks, seed: game.seed || 1 };   // to act out the replays
          if (brk.kind === 'q1' || brk.kind === 'q3') return <QuarterRecap q={brk.kind === 'q1' ? 1 : 3} plays={game.plays.slice(0, at)} score={p0.before.score} teams={teams} bc={bc} {...film} {...ends} />;
          return brk.kind === 'half' ? <HalftimeReport plays={game.plays.slice(0, at)} score={p0.before.score} teams={teams} people={people} sideOf={sideOf} bc={bc} receiver={p0.def} {...film} {...ends} />
            : <OvertimeRules teams={teams} first={p0.off} score={p0.before.score} bc={bc} {...ends} />;
        })()}
        {bugUp && <div className={`pg-bug${scoreUp || (beat.phase === 'inj' && inj) ? ' taken' : ''}${beat.phase === 'sting' || beat.phase === 'replay' ? ' snap' : ''}${beat.phase === 'replay' || beat.phase === 'call' ? ' replay' : ''}${toutUp && !scoreUp ? ' to-grow' : ''}${toutUp && bt < 1.3 ? ' to-blink' : ''}${toutBar && !scoreUp ? ' taken' : ''}`} data-to={toutUp ? tout.side : undefined}><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} rec={rec} card={card} className={fresh ? 'sb-enter' : ''} />{beat.phase === 'inj' && inj && <InjuryTakeover key={`ij${i}`} player={playerOf(inj.id)} team={teams[inj.side]} bug={bc.bug} />}{scoreUp && <ScoreTakeover key={`sc${i}`} score={g.score} team={teams[g.score.side]} people={g.score.ids.map(playerOf)} bug={bc.bug} />}{toutBar && !scoreUp && <TimeoutTakeover key={`to${i}`} team={teams[tout.side]} left={tos(tout.side)} pc={beat.playClock} bug={bc.bug} closing={bt > 3.2} />}</div>}
      </div>
      {!full && <p className="pg-text">{done ? 'That’s the game.' : beat.post ? play.text : play?.call?.name ? `${teams[play.off].code} · ${play.call.name}` : ' '}</p>}
      <GameControls paused={paused} setPaused={setPaused} speed={speed} setSpeed={setSpeed} i={i} setI={setI} total={game.plays.length} done={done} sound={sound} snd={snd} onClose={onClose} intro={introNow} />
    </div>
  );
}
