import React, { useMemo } from 'react';
import { playoffSeeds, firstRound } from '../lib/playoffSeeds.js';
import { useCraftBowlPlan, logoSrc, roman } from '../data/craftBowlPlans.js';
import { useStadiums } from '../data/stadiums.js';
import { getTeams, getTeam, currentSeason } from '../data/teams.js';
import { trophyImg } from '../data/craftBowls.js';

// The playoff bracket (from Week 7 on): Overworld on the left, Nether on the right, the Craft Bowl logo in the middle. Every
// team tile wears this season's Craft Bowl colors as a gradient, with its logo and its seed in the top right; the better seed
// is at home (🏠). Until the regular season ends it's "if the season ended today".
const CONFS = ['Overworld', 'Nether'];

function Tile({ t }) {
  if (!t) return <div className="pb-team tbd"><span className="pb-code">TBD</span></div>;
  const team = getTeam(t.id);
  return (
    <div className={`pb-team${t.home ? ' home' : ''}`} title={`${team.name} (${t.w}-${t.l})`}>
      <img src={team.logo} alt="" /><span className="pb-code">{team.code}</span><span className="pb-seed">{t.seed}</span>
    </div>
  );
}
const Game = ({ a, b, label }) => <div className="pb-game"><small>{label}</small><Tile t={a && { ...a, home: true }} /><Tile t={b} /></div>;

export default function PlayoffBracket({ rec, settled }) {
  const plan = useCraftBowlPlan(currentSeason()), stadiums = useStadiums();
  const seeds = useMemo(() => playoffSeeds(getTeams(), rec), [rec]);
  const host = plan?.stadium && getTeam(plan.stadium), src = logoSrc(plan?.logo) || trophyImg();
  const side = (c, flip) => {
    const games = firstRound(seeds[c] || []);
    const cols = [
      <div className="pb-col" key="r1"><h4>{c} · Round 1</h4>{games.map(([h, a], k) => <Game key={k} a={h} b={a} label={`${h.seed} vs ${a.seed}`} />)}</div>,
      <div className="pb-col" key="r2"><h4>{c} title</h4><Game label="Conference championship" /></div>,
    ];
    return flip ? cols.reverse() : cols;
  };
  return (
    <section className="pb" style={{ '--cb1': plan?.primary || '#19c26b', '--cb2': plan?.secondary || '#0a3d2c' }}>
      <header className="pb-head"><h2>🏆 Playoff bracket</h2><span className="dim">{settled ? 'Final seeds' : 'If the season ended today'}</span></header>
      <div className="pb-grid">
        {side(CONFS[0], false)}
        <div className="pb-mid">
          <img src={src} alt={`Craft Bowl ${roman(currentSeason())}`} />
          <b>Craft Bowl {roman(currentSeason())}</b>
          <small>{host ? `📍 ${stadiums[host.id]?.name || host.name}` : '📍 Stadium to be picked'}</small>
        </div>
        {side(CONFS[1], true)}
      </div>
      <p className="pb-note">Top 4 in each conference · single elimination · the better seed gets home field · the Craft Bowl is at a neutral stadium.</p>
    </section>
  );
}
