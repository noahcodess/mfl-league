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
import { buildScene } from '../lib/sceneKicks.js';
import { drawScene, ballAt } from '../lib/sceneDraw.js';
import { yardX, MID_Y, YD } from '../lib/fieldLayout.js';
import { paceFor, shotsFor, slowAt } from '../lib/pacing.js';

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
  const [i, setI] = useState(0), [speed, setSpeed] = useState(1), [paused, setPaused] = useState(false), [beat, setBeat] = useState({ post: false, pc: 12 });
  const kits = useGameKits(teams.home, teams.away, match), ids = useMemo(() => ['home', 'away'].flatMap((s) => everyone(lineups, s).map((p) => p.id)), [lineups]), drips = useDrips(ids);
  const looks = useMemo(() => (kits ? makeLooks(lineups, kits, teams, drips) : {}), [lineups, kits?.home?.name, kits?.away?.name, drips]); // eslint-disable-line react-hooks/exhaustive-deps
  const bc = useMemo(() => broadcastFor(match || { window: null }, teams.home), [match, teams.home]);
  const play = game.plays[i], done = i >= game.plays.length, pace = useMemo(() => play && paceFor(play), [play]);
  const S = useMemo(() => (play ? buildScene(play, lineups, pace) : null), [play, lineups, pace]), shots = useMemo(() => S && shotsFor(S, pace), [S, pace]);
  const clock = useRef({ t: 0, last: 0, phase: 'live', rt: 0, hold: 0 }), ctl = useRef({}); ctl.current = { speed, paused, S, i, shots, pace };
  useEffect(() => { Object.assign(clock.current, { t: 0, phase: 'live', rt: 0, hold: 0 }); setBeat({ post: false, pc: 12, phase: 'live' }); }, [i]);
  useEffect(() => { // the play clock, scorebug flip and which shot we're in, a few times a second
    const id = setInterval(() => { const { S: s } = ctl.current, c = clock.current; if (s) setBeat({ post: c.t >= s.tEnd, pc: Math.max(1, Math.round(15 - (c.t / s.T0) * 12)), phase: c.phase }); }, 120);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {
      const { S: s, shots: sh } = ctl.current, c = clock.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      if (c.phase === 'flag' && sh?.flag) return { x: yardX(sh.flag.x), y: MID_Y + sh.flag.y * YD, zoom: 2.1 };   // close-up on the flag
      const tt = c.phase === 'replay' ? c.rt : c.t, b = ballAt(s, tt) || { x: s.los, y: 0, h: 0 };
      if (c.phase === 'replay') return { x: yardX(b.x), y: MID_Y + b.y * YD * 0.8, zoom: 1.95 };              // same angle, zoomed in
      const slow = slowAt(sh, c.t) < 1, z = slow ? 1.6 : b.h > 3 ? 1.0 : 1.3, k = ctl.current.i === 0 ? Math.min(1, c.t / 3.8) : 1;   // the opening kickoff starts wide and slowly pushes in
      return { x: yardX(b.x), y: MID_Y + b.y * YD * 0.55 * k, zoom: 0.62 + (z - 0.62) * k * k * (3 - 2 * k) };
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p, shots: sh, pace: pc } = ctl.current, dt = c.last ? Math.min(0.1, (now - c.last) / 1000) * sp : 0;
      c.last = now; if (!s || !sh) return;
      const next = () => { c.t = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); };
      if (!p) {
        if (c.phase === 'live') { c.t += dt * slowAt(sh, c.t); if (c.t > s.tEnd + pc.dead) { if (sh.flag) { c.phase = 'flag'; c.hold = 0; } else if (sh.replay) { c.phase = 'replay'; c.rt = sh.replay.from; } else next(); } }
        else if (c.phase === 'flag') { c.hold += dt; if (c.hold > 2.4) { if (sh.replay) { c.phase = 'replay'; c.rt = sh.replay.from; } else next(); } }
        else if (c.phase === 'replay') { c.rt += dt * sh.replay.speed; if (c.rt > sh.replay.to) next(); }
      }
      drawScene(ctx, s, c.phase === 'replay' ? c.rt : c.t, cam, looks);
    },
  }), [looks]);
  const b4 = play && { quarter: play.before.quarter, clock: play.before.clock, score: play.before.score, poss: play.kind === 'kickoff' ? play.def : play.off,
    down: ['kickoff', 'xp', 'two'].includes(play.kind) ? null : play.before.down, toGo: play.before.toGo, ballOn: play.before.ballOn };   // before the snap
  const a = done ? game.plays[game.plays.length - 1].after : beat.post ? play.after : b4;
  const st = { status: done ? 'final' : 'live', quarter: a.quarter, clock_left: Math.max(0, Math.round(a.clock)), clock_running: false, home_score: a.score.home, away_score: a.score.away, home_timeouts: 3, away_timeouts: 3,
    possession: teams[a.poss]?.id, down: a.down, togo: a.toGo, ball_on: a.ballOn, play_clock: beat.post ? 40 : beat.pc };
  return (
    <div className={`pg-wrap${full ? ' pg-full' : ''}`}>
      <div className="pg">
        <GameField team={teams.home} live={live} crowd={kits?.fans || 'normal'} />
        {beat.post && beat.phase === 'live' && play?.headline && <div className="pg-headline" key={i}>{play.headline}</div>}
        {beat.phase === 'replay' && <div className={`pg-replay net-${bc.net.key}`}><b>REPLAY</b></div>}
        {beat.phase === 'flag' && shots?.flag && <div className="pg-flag"><span>🚩</span>{shots.flag.text}</div>}
        {!beat.post && pace?.keyPlay && <div className="pg-key">KEY PLAY</div>}
        {done && <div className="pg-headline final">FINAL</div>}
        <div className="pg-bug"><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} /></div>
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
