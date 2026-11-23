// The injury report a few plays after a player goes down: a tall card (about the shape of an Instagram post) that slides in
// from the right in the program's own colors and font. The hurt player's card (headshot, number, position, stars, a few
// ratings), what it is, how bad, how long he's out and when he's expected back, and the backup filling in at the bottom.
import React from 'react';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import MedicalCross from './MedicalCross.jsx';
import { overall } from '../lib/simLineup.js';
import { SEASON } from '../lib/injuryTypes.js';

const r = (p, k) => p?.r?.[k] ?? '-';
// x: the injury (simInjury). n: the play now (has he come back yet?). player / sub: sim players. team: his team.
// bug: the network. week: this game's week (or null). out: leaving.
export default function InjuryReport({ x, n = 0, player, sub, team, bug, week = null, out = false }) {
  const backNow = x.back != null && n >= x.back, season = x.weeks >= SEASON, status = backNow ? 'BACK IN THE GAME' : x.weeks === 0 ? 'QUESTIONABLE TO RETURN' : 'OUT FOR THE GAME';
  const time = season ? 'Rest of the season' : x.weeks === 0 ? 'Day to day' : `${x.weeks} week${x.weeks > 1 ? 's' : ''}`;
  const back = season ? 'Next season' : x.weeks === 0 ? 'Next game' : week ? `Week ${week + x.weeks + 1}` : `In ${x.weeks + 1} games`;
  return (
    <div className={`ir bgx-${bug}${out ? ' out' : ''}`} style={{ '--tc': team.color, '--ta': team.accent }}>
      <div className="ir-head"><MedicalCross /><b>INJURY REPORT</b><img src={team.logo} alt="" /></div>
      <div className="ir-player">
        <Headshot player={player} team={team} size={96} />
        <div>
          <small>#{player?.number ?? '-'} · {player?.pos} · {team.code}</small>
          <b>{player?.name}</b>
          <StarRating value={player?.stars ?? 0} />
          <span className="ir-rates"><i>OVR <b>{player ? overall(player) : '-'}</b></i><i>SPD <b>{r(player, 'speed')}</b></i><i>TGH <b>{r(player, 'toughness')}</b></i></span>
        </div>
      </div>
      <div className={`ir-status${x.weeks === 0 && !backNow ? ' q' : ''}`}>{status}</div>
      <div className="ir-what"><b>{x.label}</b><span className={`ir-sev s-${x.severity.toLowerCase().split('-')[0]}`}>{x.severity}</span></div>
      <dl className="ir-facts"><div><dt>Time out</dt><dd>{time}</dd></div><div><dt>Expected back</dt><dd>{back}</dd></div></dl>
      {sub && (
        <div className="ir-sub">
          <small>Stepping in</small>
          <div><Headshot player={sub} team={team} size={48} /><span><b>{sub.name}</b><em>#{sub.number ?? '-'} · {sub.pos} · OVR {overall(sub)}</em></span><StarRating value={sub.stars ?? 0} /></div>
        </div>
      )}
    </div>
  );
}
