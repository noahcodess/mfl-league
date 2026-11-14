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
  const play = game.plays[i], done = i >= game.plays.length, S = useMemo(() => (play ? buildScene(play, lineups) : null), [play, lineups]);
  const clock = useRef({ t: 0, last: 0 }), ctl = useRef({}); ctl.current = { speed, paused, S, i };
  useEffect(() => { clock.current.t = 0; setBeat({ post: false, pc: 12 }); }, [i]);
  useEffect(() => { // the play clock and the scorebug flip, a few times a second
    const id = setInterval(() => { const { S: s } = ctl.current, t = clock.current.t; if (s) setBeat({ post: t >= s.tEnd, pc: Math.max(1, Math.round(12 - (t / s.T0) * 9)) }); }, 120);
    return () => clearInterval(id);
  }, []);
  const live = useMemo(() => ({
    target() {
      const { S: s } = ctl.current; if (!s) return { x: yardX(50), y: MID_Y, zoom: 0.7 };
      const b = ballAt(s, clock.current.t) || { x: s.los, y: 0, h: 0 };
      return { x: yardX(b.x), y: MID_Y + b.y * YD * 0.55, zoom: b.h > 3 ? 1.15 : 1.5 };
    },
    draw(ctx, cam) {
      const c = clock.current, now = performance.now(), { S: s, speed: sp, paused: p } = ctl.current;
      if (!p && c.last) c.t += Math.min(0.1, (now - c.last) / 1000) * sp;
      c.last = now; if (!s) return;
      drawScene(ctx, s, c.t, cam, looks);
      if (c.t > s.dur && !p) { c.t = 0; setI((n) => (n === ctl.current.i ? n + 1 : n)); }
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
        {beat.post && play?.headline && <div className="pg-headline" key={i}>{play.headline}</div>}
        {done && <div className="pg-headline final">FINAL</div>}
        <div className="pg-bug"><Scorebug bc={bc} home={teams.home} away={teams.away} st={st} /></div>
      </div>
      {(!full || beat.post || done) && <p className="pg-text">{done ? 'That’s the game.' : beat.post ? play.text : ' '}</p>}
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
