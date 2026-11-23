// Sunday Night Football's starting lineup showcase (introPlan): the scorebug grows a panel above it in SNF's look, the
// team's name and OFFENSE or DEFENSE sweeping in letter by letter, then the starters five at a time: the position big,
// his headshot, his name and his star rating, each card popping in one after another. Two slides, then it folds back in.
import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import { INTRO_LEN } from '../lib/introPlan.js';

const POS = (key) => key.replace(/\d$/, '');
// x: { side, unit }. team: that team. slides: from introSlides. playerOf(id): the game's sim player. t: seconds it's been up.
export default function LineupShowcase({ x, team, slides, playerOf, t }) {
  const k = t < INTRO_LEN / 2 + 0.2 ? 0 : 1, word = x.unit === 'O' ? 'OFFENSE' : 'DEFENSE', out = t > INTRO_LEN - 0.45;
  return (
    <div className={`lsx${out ? ' out' : ''}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <div className="lsx-head">
        <img src={team.logo} alt="" />
        <b>{(team.nickname || team.name).toUpperCase()}</b>
        <span className="lsx-word">{[...word].map((ch, n) => <i key={n} style={{ animationDelay: `${0.25 + n * 0.05}s` }}>{ch}</i>)}</span>
        <small>STARTING LINEUP · {k + 1}/2</small>
      </div>
      <div className="lsx-row" key={k}>
        {(slides[k] || []).map((s, n) => {
          const p = playerOf(s.player.id) || s.player;
          return (
            <div key={s.key} className="lsx-card" style={{ animationDelay: `${(k ? 0.1 : 0.55) + n * 0.12}s` }}>
              <span className="lsx-pos">{POS(s.key)}</span>
              <Headshot player={p} team={team} size={56} />
              <b>{(p.last || p.name || '').toUpperCase()}</b>
              <em>#{p.number ?? '-'}</em>
              <StarRating value={p.stars ?? 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
