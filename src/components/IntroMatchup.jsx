import React from 'react';
import PixelCanvas from './PixelCanvas.jsx';
import IntroSprite from './IntroSprite.jsx';
import { makeDrift } from '../lib/pixelSwarm.js';
import { headliners } from '../data/gameKits.js';
import { recordText } from '../lib/seasonStats.js';
import { brightness } from '../lib/pixels.js';

function Half({ side, team, kit, rec }) {
  return (
    <section className={`match-half ${side}`} style={{ '--tc': team.color, '--ta': brightness(team.accent) < 0.35 ? '#ffffff' : team.accent }}>
      <PixelCanvas className="half-px" w={160} h={180} make={(w, h) => makeDrift(w, h, [team.color, team.accent, '#ffffff'], 70, side === 'home' ? 9 : 4)} deps={[team.id]} />
      <img className="half-logo" src={team.logo} alt="" />
      <div className="half-name" style={{ '--len': team.name.length }}><small>{side === 'home' ? 'Home' : 'Away'}</small><b>{team.name}</b><span>{recordText(rec)}</span></div>
      <div className="half-squad">
        {headliners(team.id).map((p, i) => (
          <figure key={p.id} style={{ '--i': i }}>
            <IntroSprite player={p} kit={kit} team={team} scale={3} />
            <figcaption><small>{p.position}</small>{p.name.split(' ').slice(-1)[0]}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// Intro shot 2: the two teams face off, each with its logo, record and three headliners in today's uniforms, pixels moving
// behind them in team colors. A bar along the bottom gives the week, kickoff time and stadium.
export default function IntroMatchup({ bc, game, home, away, kits, rec, stadium }) {
  return (
    <div className="intro-scene sc-match">
      <Half side="away" team={away} kit={kits?.away} rec={rec[away.id]} />
      <Half side="home" team={home} kit={kits?.home} rec={rec[home.id]} />
      <div className="match-vs"><span>@</span></div>
      <div className="match-bar"><img src={bc.net.logo} alt="" /><span>Week {game.week}</span><span>{game.time}</span><span>{stadium?.name}</span></div>
    </div>
  );
}
