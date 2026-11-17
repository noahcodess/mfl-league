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
import BroadcastSlot, { slotCard, slotBusy } from './BroadcastSlot.jsx';
import ScoreTakeover from './ScoreTakeover.jsx';
import { planGraphics } from '../lib/broadcastGfx.js';

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
// uniforms), if it's a real one. full: fills the broadcast screen with the controls on top.
export default function PixelGame({ game, teams, lineups, onClose, match = null, full = false }) {
  const [sting, setSting] = useState(0), [i, setI] = useState(0), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [beat0, setBeat] = useState({ post: false, phase: 'live', i: 0 });
  const beat = beat0.i === i ? beat0 : { post: false, phase: 'live', i };   // a beat from the last play never leaks into this one (no flash of how this play ends)
  const kits = useGameKits(teams.home, teams.away, match), ids = useMemo(() => ['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => p.id)), [lineups]), drips = useDrips(ids);
  const looks = useMemo(() => (kits ? makeLooks(lineups, kits, teams, drips) : {}), [lineups, kits?.home?.name, kits?.away?.name, drips]); // eslint-disable-line react-hooks/exhaustive-deps
  const bc = useMemo(() => broadcastFor(match || { window: null }, teams.home), [match, teams.home]);
  const play = game.plays[i], done = i >= game.plays.length, pace = useMemo(() => play && paceFor(play), [play]);
  const S = useMemo(() => (play ? buildScene(play, lineups, pace, game.seed || 1) : null), [play, lineups, pace, game.seed]), shots = useMemo(() => S && shotsFor(S, pace), [S, pace]);
  const live0 = useRef(null); useEffect(() => { live0.current = S; }, [S]);   // the play as it's being acted out right now
  const plan = useMemo(() => planGraphics(game.plays), [game.plays]), g = plan[i] || {};   // every graphic, planned so only one is ever up
  const people = useMemo(() => Object.fromEntries(['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => [p.id, p]))), [lineups]), playerOf = (id) => people[id];
  const clock = useRef({ t: 0, last: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0 }), ctl = useRef({}); ctl.current = { speed, paused, S, i, shots, pace, sc: g.score };
  useEffect(() => { Object.assign(clock.current, { t: 0, phase: 'live', rt: 0, hold: 0, tdAt: null, tdReal: 0 }); setBeat({ post: false, phase: 'live', i }); }, [i]);
  useEffect(() => { // the play clock, scorebug flip and which shot we're in, a few times a second
    const id = setInterval(() => { const { S: s, i: n, pace: pc } = ctl.current, c = clock.current; if (s) setBeat({ i: n, post: c.t >= s.tEnd, t: c.t, tdAt: c.tdAt, phase: c.phase, ...clockFace(game, n, c.t, s, c.phase, pc.dead) }); }, 100);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {   // the camera operator (broadcastCam) decides the shot
      const { S: s, shots: sh } = ctl.current, c = clock.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      return camTarget(s, live0.current || s, { phase: c.phase, t: c.phase === 'replay' ? c.rt : c.t, slow: slowAt(sh, c.t) < 1, first: ctl.current.i === 0, flag: sh?.flag });
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p, shots: sh, pace: pc, sc } = ctl.current, dt = c.last ? Math.min(0.1, (now - c.last) / 1000) * sp : 0;
      c.last = now; if (!s || !sh) return;
      const next = () => { c.t = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); };
      if (!p) {
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
  const pre = !beat.post && beat.phase === 'live' && !!play, bt = beat.t ?? 0, busy = slotBusy(g.pre, pace, bt, pre), card = slotCard(g.pre, pace, bt, pre, teams, playerOf);
  const scoreUp = !!g.score && beat.phase === 'live' && beat.tdAt != null && bt >= beat.tdAt;   // the scoring takeover of the bug
  const bugUp = i > 0 || done || bt >= (S?.T0 ?? 0);   // the scorebug builds in as the opening kickoff is struck
  const b4 = play && { quarter: play.before.quarter, clock: play.before.clock, score: play.before.score, poss: play.kind === 'kickoff' ? play.def : play.off,
    down: ['kickoff', 'xp', 'two'].includes(play.kind) ? null : play.before.down, toGo: play.before.toGo, ballOn: play.before.ballOn };   // before the snap
  const a = done ? game.plays[game.plays.length - 1].after : beat.post ? play.after : b4;
  const dn = !done && beat.post && bt < (S?.tEnd ?? 0) + 1 ? b4 : a;   // down and distance turn over about a second after the whistle
  const ticking = !done && beat.clock != null, clk = ticking ? beat.clock : a.clock;
  const st = { status: done ? 'final' : 'live', quarter: a.quarter, clock_left: Math.max(0, Math.ceil(clk)), clock_running: ticking && beat.running, home_score: a.score.home, away_score: a.score.away, home_timeouts: 3, away_timeouts: 3,
    possession: teams[dn.poss]?.id, try: !done && dn === b4 && play?.kind === 'xp' ? 'PAT' : !done && dn === b4 && play?.kind === 'two' ? '2-PT Try' : null, down: dn.down, togo: dn.toGo, ball_on: dn.ballOn, play_clock: beat.playClock ?? 40 };
  return (
    <div className={`pg-wrap${full ? ' pg-full' : ''}`}>
      <div className="pg" data-kind={play?.kind}>
        <GameField team={teams.home} live={live} crowd={kits?.fans || 'normal'} />
        {beat.post && beat.phase === 'live' && play?.headline && !g.score && <div className="pg-headline" key={i}>{play.headline}</div>}
        {beat.phase === 'replay' && <div className={`pg-replay net-${bc.net.key}`}><b>REPLAY</b></div>}
        {sting > 0 && <NetStinger key={sting} net={bc.net} onDone={() => setSting(0)} />}
        {beat.phase === 'flag' && shots?.flag && <div className="pg-flag"><span>🚩</span>{shots.flag.text}</div>}
        {!beat.post && pace?.keyPlay && !busy && <div className="pg-key">KEY PLAY</div>}
        {done && <div className="pg-headline final">FINAL</div>}
        <BroadcastSlot pre={g.pre} pace={pace} bt={bt} live={pre} play={play} teams={teams} bug={bc.bug} playerOf={playerOf} n={i} />
        {bugUp && <div className="pg-shelf" />}
        {bugUp && <div className={`pg-bug${scoreUp ? ' taken' : ''}`}><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} card={card} className={i === 0 ? 'sb-enter' : ''} />{scoreUp && <ScoreTakeover key={`sc${i}`} score={g.score} team={teams[g.score.side]} people={g.score.ids.map(playerOf)} bug={bc.bug} />}</div>}
      </div>
      {(!full || beat.post || done || play?.call?.name) && <p className="pg-text">{done ? 'That’s the game.' : beat.post ? play.text : play?.call?.name ? `${teams[play.off].code} · ${play.call.name}` : ' '}</p>}
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
