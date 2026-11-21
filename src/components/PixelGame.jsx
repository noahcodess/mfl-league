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
import { yardX, MID_Y, YD } from '../lib/fieldLayout.js';
import { paceFor, shotsFor, slowAt } from '../lib/pacing.js';
import { clockFace } from '../lib/broadcastClock.js';
import { camTarget } from '../lib/broadcastCam.js';
import NetStinger from './NetStinger.jsx';
import { STING_MID } from '../lib/pixelSwarm.js';
import BroadcastSlot, { slotCard, slotBusy, slotWindow } from './BroadcastSlot.jsx';
import ScoreTakeover from './ScoreTakeover.jsx';
import { planGraphics } from '../lib/broadcastGfx.js';
import HalftimeReport from './HalftimeReport.jsx';
import OvertimeRules from './OvertimeRules.jsx';
import useBoothRemote from './useBoothRemote.js';
import { finalText } from '../data/gameState.js';

const SPEEDS = [1, 2, 4];
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
// onInput(input): a timeout or test tool from the booth (the game replays from there).
export default function PixelGame({ game, teams, lineups, onClose, onDone, onPlay, startAt = 0, match = null, full = false, rec = null, boothId = null, onInput }) {
  const [sting, setSting] = useState(0), [i, setI] = useState(startAt), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [beat0, setBeat] = useState({ post: false, phase: 'live', i: startAt });
  const beat = beat0.i === i ? beat0 : { post: false, phase: 'live', i };   // a beat from the last play never leaks into this one (no flash of how this play ends)
  const [brk, setBrk] = useState(null), shownBrk = useRef(new Set());   // a break between plays: 'half' (the halftime report) or 'ot' (the overtime rules), live = covering the field
  const kits = useGameKits(teams.home, teams.away, match), ids = useMemo(() => ['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => p.id)), [lineups]), drips = useDrips(ids);
  const looks = useMemo(() => (kits ? makeLooks(lineups, kits, teams, drips) : {}), [lineups, kits?.home?.name, kits?.away?.name, drips]); // eslint-disable-line react-hooks/exhaustive-deps
  const bc = useMemo(() => broadcastFor(match || { window: null }, teams.home), [match, teams.home]);
  const play = game.plays[i], done = i >= game.plays.length, pace = useMemo(() => play && paceFor(play), [play]);
  const S = useMemo(() => (play ? buildScene(play, lineups, pace, game.seed || 1) : null), [play, lineups, pace, game.seed]), shots = useMemo(() => S && shotsFor(S, pace), [S, pace]);
  useEffect(() => { if (done) onDone?.(); }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPlay?.(i); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const live0 = useRef(null); useEffect(() => { live0.current = S; }, [S]);   // the play as it's being acted out right now
  const plan = useMemo(() => planGraphics(game.plays), [game.plays]), g = plan[i] || {};   // every graphic, planned so only one is ever up
  const people = useMemo(() => Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, p]))), [lineups]), playerOf = (id) => people[id];
  const sideOf = useMemo(() => Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, s]))), [lineups]);
  const marks = useMemo(() => ({ half: game.plays.findIndex((p) => p.before.quarter === 3), ot: game.plays.findIndex((p) => p.before.quarter >= 5) }), [game.plays]);   // the second-half kickoff and the first overtime snap
  useEffect(() => { const kind = i === marks.half ? 'half' : i === marks.ot ? 'ot' : null; if (kind && i > 0 && !shownBrk.current.has(i)) { shownBrk.current.add(i); setBrk({ kind, live: true }); } }, [i, marks]);
  const fresh = i === 0 || i === marks.half || i === marks.ot;   // the scorebug builds in again for these kickoffs
  const jumpTo = (k) => { const q = play?.before.quarter ?? 1, at = k === 'half' ? marks.half : k === 'ot' ? marks.ot : k === 'nextq' ? game.plays.findIndex((p, n) => n > i && p.before.quarter > q) : -1; setI(at > i ? at : game.plays.length); };
  const booth = useBoothRemote({ gameId: boothId, game, i, people, sideOf, act: { setPaused, setSpeed, setI, jumpTo, onInput, preview: (kind) => setBrk({ kind, live: true, at: i }) },
    read: () => ({ i, total: game.plays.length, paused, speed, phase: beat.phase, post: beat.post, t: beat.t ?? 0, T0: S?.T0, tEnd: S?.tEnd, dead: pace?.dead, clock: beat.clock, playClock: beat.playClock, brk: brk?.kind || null,
      play: play && { n: play.n, kind: play.kind, off: play.off, keyPlay: !!play.keyPlay, call: play.call?.name || null, before: play.before, text: beat.post ? play.text : null },
      pre: g.pre ? { id: `pre-${i}`, type: g.pre.type, label: g.pre.type === 'card' ? `${playerOf(g.pre.id)?.name} stat card` : g.pre.type === 'drive' ? 'Drive summary' : g.pre.type === 'fg' ? `Field goal bar (${g.pre.dist} yds)` : 'Ball on tag', window: slotWindow(g.pre, pace) } : null,
      marks, timeouts: game.timeouts || [], score: (beat.post ? play?.after?.score : play?.before.score) || game.score }) });
  const clock = useRef({ t: 0, last: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0 }), ctl = useRef({}); ctl.current = { speed, paused: paused || !!brk?.live, S, i, shots, pace, sc: g.score, fresh, hold: booth.hold };
  useEffect(() => { Object.assign(clock.current, { t: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0 }); setBeat({ post: false, phase: 'live', i }); }, [i]);
  useEffect(() => { // the play clock, scorebug flip and which shot we're in, a few times a second
    const id = setInterval(() => { const { S: s, i: n, pace: pc } = ctl.current, c = clock.current; if (s) setBeat({ i: n, post: c.t >= s.tEnd, t: c.t, tdAt: c.tdAt, phase: c.phase, ...clockFace(game, n, c.t, s, c.phase, pc.dead) }); }, 100);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {   // the camera operator (broadcastCam) decides the shot
      const { S: s, shots: sh } = ctl.current, c = clock.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      return camTarget(s, live0.current || s, { phase: c.phase, t: c.phase === 'replay' ? c.rt : c.t, slow: slowAt(sh, c.t) < 1, first: ctl.current.fresh, flag: sh?.flag, replay: sh?.replay });
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p, shots: sh, pace: pc, sc } = ctl.current, dt = c.last ? Math.min(0.1, (now - c.last) / 1000) * sp : 0;
      c.last = now; if (!s || !sh) return;
      const next = () => { c.t = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); };
      if (!p && !(ctl.current.hold && c.phase === 'live' && c.t >= s.T0 - 0.5 && c.t < s.T0)) {   // the booth can hold the snap (the play clock stops)
        if ((c.phase === 'sting' || c.phase === 'replay') && !sh.replay) c.phase = 'live';   // jumped to a new play mid-replay (booth skip): pick the new one up live
        const toReplay = () => { c.phase = 'sting'; c.hold = 0; setSting((n) => n + 1); };   // the network transition covers the cut to the replay
        if (c.phase === 'live') { c.t += dt * slowAt(sh, c.t); if (c.t > s.tEnd + pc.dead && (c.tdAt == null || (c.tdReal && now - c.tdReal > (sc?.type === 'fg' ? 3300 : 3700)))) {   // the scoring takeover runs its full length at any speed
          if (sh.flag) { c.phase = 'flag'; c.hold = 0; } else if (sh.replay) toReplay(); else next(); } }
        else if (c.phase === 'flag') { c.hold += dt; if (c.hold > 2.4) { if (sh.replay) toReplay(); else next(); } }
        else if (c.phase === 'sting') { c.hold += dt; if (c.hold > STING_MID / 1000) { c.phase = 'replay'; c.rt = sh.replay.from; } }
        else if (c.phase === 'replay') { c.rt += dt * sh.replay.speed; if (c.rt > sh.replay.to) { setSting((n) => n + 1); next(); } }   // and the cut back
      }
      live0.current = seek(live0.current || s, c.phase === 'replay' ? c.rt : c.t);   // step the live play to now (a replay rewinds and replays it)
      const h = live0.current.ball.holder;   // touchdown: the show starts half a second after he has it in the end zone
      const td = sc?.type === 'td' && sc, way = td && (td.side === s.play.off ? s.dir : -s.dir);   // the end zone the scorer is going for
      if (sc?.type === 'fg' && c.tdAt == null && c.t >= s.tEnd - 0.15) c.tdAt = c.t;   // a good kick: right as it clears the bar
      if (td && c.tdAt == null && c.phase === 'live' && ((h && h.id === td.ids[0] && (way > 0 ? h.x > 100 : h.x < 0)) || c.t >= s.tEnd)) c.tdAt = c.t + (c.t >= s.tEnd ? 0 : 0.5);
      if (c.tdAt != null && !c.tdReal && c.t >= c.tdAt) c.tdReal = now;
      drawScene(ctx, live0.current, cam, looks);
    },
  }), [looks]);
  const gpre = booth.denied.has(`pre-${i}`) ? null : g.pre, man = booth.manual && playerOf(booth.manual.id);   // the commissioner can deny a graphic, or put up a stat card
  const pre = !beat.post && beat.phase === 'live' && !!play, bt = beat.t ?? 0, busy = slotBusy(gpre, pace, bt, pre);
  const card = (man && { side: booth.manual.side, player: man, team: teams[booth.manual.side], lines: booth.manual.lines, out: booth.manual.until - Date.now() < 450 }) || slotCard(gpre, pace, bt, pre, teams, playerOf);   // his card beats the planned one
  const tout = (game.timeouts || []).find((x) => x.n === i + 1), toutUp = tout && pre && bt < 3.4;   // a timeout before this snap: the banner, and the pip goes out
  const tos = (side) => { const v = (beat.post ? game.plays[i + 1]?.before.to : play?.before.to)?.[side] ?? 3; return toutUp && tout.side === side && bt < 1.3 ? v + 1 : v; };
  const scoreUp = !!g.score && beat.phase === 'live' && beat.tdAt != null && bt >= beat.tdAt;   // the scoring takeover of the bug
  const bugUp = !brk?.live && (!fresh || done || bt >= (S?.T0 ?? 0));   // the scorebug builds in as the opening (and second-half, and overtime) kickoff is struck
  const b4 = play && { quarter: play.before.quarter, clock: play.before.clock, score: play.before.score, poss: play.kind === 'kickoff' ? play.def : play.off,
    down: ['kickoff', 'xp', 'two'].includes(play.kind) ? null : play.before.down, toGo: play.before.toGo, ballOn: play.before.ballOn };   // before the snap
  const aft = (p) => ({ quarter: p.before.quarter, clock: p.before.clock, ...p.after });   // a try's after holds only the score: keep its quarter and clock
  const a = done ? aft(game.plays[game.plays.length - 1]) : beat.post ? aft(play) : b4;
  const dn = !done && beat.post && bt < (S?.tEnd ?? 0) + 1 ? b4 : a;   // down and distance turn over about a second after the whistle
  const ticking = !done && beat.clock != null, clk = ticking ? beat.clock : a.clock;
  const st = { status: done ? 'final' : 'live', quarter: a.quarter, clock_left: Math.max(0, Math.ceil(clk)), clock_running: ticking && beat.running, home_score: a.score.home, away_score: a.score.away, home_timeouts: tos('home'), away_timeouts: tos('away'),
    possession: done ? null : teams[dn.poss]?.id, try: !done && dn === b4 && play?.kind === 'xp' ? 'PAT' : !done && dn === b4 && play?.kind === 'two' ? '2-PT Try' : null, down: dn.down, togo: dn.toGo, ball_on: dn.ballOn, play_clock: booth.hold && booth.pc != null ? booth.pc : beat.playClock ?? 24 };
  return (
    <div className={`pg-wrap${full ? ' pg-full' : ''}`}>
      <div className="pg" data-kind={play?.kind}>
        <GameField team={teams.home} live={live} crowd={kits?.fans || 'normal'} />
        {beat.post && beat.phase === 'live' && play?.headline && !g.score && <div className="pg-headline" key={i}>{play.headline}</div>}
        {beat.phase === 'replay' && <div className={`pg-replay net-${bc.net.key}`}><b>REPLAY</b></div>}
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        {beat.phase === 'flag' && shots?.flag && <div className="pg-flag"><span>🚩</span>{shots.flag.text}</div>}
        {!beat.post && pace?.keyPlay && !busy && <div className="pg-key">KEY PLAY</div>}
        {done && <div className="pg-headline final">{finalText(4 + (game.overtimes || 0)).toUpperCase()}</div>}
        {toutUp && <div className={`pg-timeout net-${bc.net.key}`} key={`to${i}`} style={{ '--tc': teams[tout.side].color }}><img src={teams[tout.side].logo} alt="" /><b>TIMEOUT</b><span>{teams[tout.side].name}</span></div>}
        <BroadcastSlot pre={gpre} pace={pace} bt={bt} live={pre} play={play} teams={teams} bug={bc.bug} playerOf={playerOf} n={i} />
        {bugUp && <div className="pg-shelf" />}
        {brk && (() => {   // the break plays at its mark, or wherever the booth previews it (at)
          const at = brk.at ?? (brk.kind === 'half' ? marks.half : marks.ot), p0 = game.plays[Math.min(at, game.plays.length - 1)], ends = { onReveal: () => setBrk((b) => b && { ...b, live: false }), onDone: () => setBrk(null) };
          return brk.kind === 'half' ? <HalftimeReport plays={game.plays.slice(0, at)} score={p0.before.score} teams={teams} people={people} sideOf={sideOf} bc={bc} receiver={p0.def} {...ends} />
            : <OvertimeRules teams={teams} first={p0.off} score={p0.before.score} bc={bc} {...ends} />;
        })()}
        {bugUp && <div className={`pg-bug${scoreUp ? ' taken' : ''}${beat.phase === 'sting' || beat.phase === 'replay' ? ' snap' : ''}${beat.phase === 'replay' ? ' replay' : ''}`}><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} rec={rec} card={card} className={fresh ? 'sb-enter' : ''} />{scoreUp && <ScoreTakeover key={`sc${i}`} score={g.score} team={teams[g.score.side]} people={g.score.ids.map(playerOf)} bug={bc.bug} />}</div>}
      </div>
      {!full && <p className="pg-text">{done ? 'That’s the game.' : beat.post ? play.text : play?.call?.name ? `${teams[play.off].code} · ${play.call.name}` : ' '}</p>}
      <div className="ct-row">
        <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? '▶ Play' : '⏸ Pause'}</button>
        {SPEEDS.map((s) => <button key={s} className={`btn ghost${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s}x</button>)}
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(Math.max(0, i - 1))}>⏮ Back</button>
        <button className="btn ghost" disabled={done} onClick={() => setI(i + 1)}>Next ⏭</button>
        <span className="dim">Play {Math.min(i + 1, game.plays.length)} of {game.plays.length}</span>
        {onClose && <button className="btn ghost" onClick={onClose}>✕ Close</button>}
      </div>
    </div>
  );
}
