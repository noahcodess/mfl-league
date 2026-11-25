import React, { useMemo } from 'react';
import { playoffSeeds, firstRound } from '../lib/playoffSeeds.js';
import { useCraftBowlPlan, logoSrc, roman } from '../data/craftBowlPlans.js';
import { useStadiums } from '../data/stadiums.js';
import { getTeams, getTeam, currentSeason } from '../data/teams.js';
import { trophyImg } from '../data/craftBowls.js';
import ConfLogo from './ConfLogo.jsx';

// The playoff bracket (from Week 7 on): Overworld on the left, Nether on the right, the Craft Bowl logo in the middle. Every
// team tile wears this season's Craft Bowl colors as a gradient, with its logo and its seed in the top right; the better seed
// is at home (🏠). Until the regular season ends it's "if the season ended today". Once the playoffs start (rounds = the
// season's playoff rounds) each game fills in: the score on each tile, the loser greyed out, the winner moving on.
const CONFS = ['Overworld', 'Nether'];

function Tile({ t, score, lost }) {
  if (!t) return <div className="pb-team tbd"><span className="pb-code">TBD</span></div>;
  const team = getTeam(t.id);
  return (
    <div className={`pb-team${t.home ? ' home' : ''}${lost ? ' lost' : ''}`} title={`${team.name} (${t.w}-${t.l})`}>
      <img src={team.logo} alt="" /><span className="pb-code">{team.code}</span>
      {score != null && <b className="pb-score">{score}</b>}<span className="pb-seed">{t.seed}</span>
    </div>
  );
}

// One matchup: a (home) on top, b below. g: the real game once it's set, for the score and who won.
function Game({ a, b, label, g, neutral = false }) {
  const done = g?.status === 'final', sc = (t) => (!done || !t ? null : t.id === g.home ? g.homeScore : g.awayScore);
  const lost = (t) => done && t && sc(t) < sc(t.id === g.home ? { id: g.away } : { id: g.home });
  return (
    <div className={`pb-game${done ? ' done' : ''}`}><small>{label}</small>
      <Tile t={a && { ...a, home: !neutral }} score={sc(a)} lost={lost(a)} /><Tile t={b} score={sc(b)} lost={lost(b)} />
    </div>
  );
}

const winnerOf = (g) => (g?.status === 'final' ? (g.homeScore > g.awayScore ? g.home : g.away) : null);
const findGame = (list, x, y) => (list || []).find((g) => (g.home === x && g.away === y) || (g.home === y && g.away === x));

export default function PlayoffBracket({ rec, settled, rounds = [] }) {
  const plan = useCraftBowlPlan(currentSeason()), stadiums = useStadiums();
  const seeds = useMemo(() => playoffSeeds(getTeams(), rec), [rec]);
  const host = plan?.stadium && getTeam(plan.stadium), src = logoSrc(plan?.logo) || trophyImg();
  const games = (kind) => rounds.find((r) => r.kind === kind)?.games || [];
  const seedRow = (id) => id && Object.values(seeds).flat().find((s) => s.id === id);
  const champs = {};
  const side = (c, flip) => {
    const r1 = firstRound(seeds[c] || []);
    const r1Games = r1.map(([h, a]) => findGame(games('quarterfinal'), h.id, a.id));
    const [w1, w2] = r1Games.map(winnerOf).map(seedRow);
    const top = w1 && w2 ? (w1.seed < w2.seed ? [w1, w2] : [w2, w1]) : [w1, w2];
    const sf = top[0] && top[1] ? findGame(games('semifinal'), top[0].id, top[1].id) : null;
    champs[c] = seedRow(winnerOf(sf));
    const cols = [
      <div className="pb-col" key="r1"><h4><ConfLogo conf={c} size={22} />{c} · Quarterfinals</h4>
        {r1.map(([h, a], k) => <Game key={k} a={h} b={a} g={r1Games[k]} label={`${h.seed} vs ${a.seed}`} />)}</div>,
      <div className="pb-col" key="r2"><h4><ConfLogo conf={c} size={22} />{c} · Semifinal</h4><Game a={top[0]} b={top[1]} g={sf} label="Conference championship" /></div>,
    ];
    return flip ? cols.reverse() : cols;
  };
  const left = side(CONFS[0], false), right = side(CONFS[1], true);
  const cb = games('craft_bowl')[0], champ = winnerOf(cb) && getTeam(winnerOf(cb));
  const cbTeams = cb ? [seedRow(cb.home), seedRow(cb.away)] : [champs[CONFS[0]], champs[CONFS[1]]];
  const started = rounds.length > 0;
  return (
    <section className="pb" style={{ '--cb1': plan?.primary || '#19c26b', '--cb2': plan?.secondary || '#0a3d2c' }}>
      <header className="pb-head"><h2>🏆 Playoff bracket</h2><span className="dim">{started ? 'Single elimination' : settled ? 'Final seeds' : 'If the season ended today'}</span></header>
      <div className="pb-grid">
        {left}
        <div className="pb-mid">
          <img src={src} alt={`Craft Bowl ${roman(currentSeason())}`} />
          <b>Craft Bowl {roman(currentSeason())}</b>
          <small>{host ? `📍 ${stadiums[host.id]?.name || host.name}` : '📍 Stadium to be picked'}</small>
          {(cb || cbTeams.some(Boolean)) && <div className="pb-cb"><Game a={cbTeams[0]} b={cbTeams[1]} g={cb} label="Neutral site" neutral /></div>}
          {champ && <span className="pb-champ">🏆 {champ.name}</span>}
        </div>
        {right}
      </div>
      <p className="pb-note">Top 4 in each conference · single elimination · the better seed gets home field · the Craft Bowl is at a neutral stadium.</p>
    </section>
  );
}
