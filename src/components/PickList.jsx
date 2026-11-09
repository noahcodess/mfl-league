import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { getTeamByCode } from '../data/teams.js';
import { ordinal } from '../lib/format.js';

// Draft picks a team owns, by season: whose pick it is (team logo) and the round.
export default function PickList({ picks, currentSeason }) {
  const seasons = [...new Set(picks.map((p) => p.season))];
  return (
    <section className="card">
      <h3>Draft picks <span className="count">{picks.length}</span></h3>
      <div className="picks">
        {seasons.map((s) => (
          <div className="pick-season" key={s}>
            <span className={`pick-s${s === currentSeason ? ' now' : ''}`}>S{s}{s === currentSeason && <small> next draft</small>}</span>
            {picks.filter((p) => p.season === s).map((p, i) => {
              const from = getTeamByCode(p.originalCode);
              return (
                <span key={i} className="pick" title={`${from?.name || p.originalCode} ${ordinal(p.round)} round pick`}>
                  {from ? <TeamBadge team={from} size="xs" /> : <span className="pick-code">{p.originalCode}</span>}
                  {ordinal(p.round)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
