import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import { usePlayerHistory, DEAL_SOURCE, DEAL_STATUS } from '../data/playerHistory.js';
import { getTeam } from '../data/teams.js';
import { money } from '../lib/format.js';

const LEFT = { let_go: 'Not re-signed: went to free agency', talks_failed: 'Contract talks fell apart', walked: 'Walked in free agency' };
const seasons = (a, b) => (a === b ? `Season ${a}` : `Seasons ${a}–${b}`);

// "Past teams" tab: where he was drafted, then every team he's played for and the deals he signed, newest first.
export default function PastTeams({ player }) {
  const history = usePlayerHistory(player);
  if (!history) return <p className="dim">Loading his history...</p>;
  const { stints, drafted } = history;
  const draftTeam = drafted ? getTeam(drafted.teamId) : null;
  const newestFirst = [...stints].reverse();
  const startedWithImport = stints[0]?.deals[0]?.source === 'import';
  return (
    <div className="career">
      {drafted && (
        <div className="career-draft">
          🎓 Drafted in the <b>Season {drafted.season} draft</b> · Round {drafted.round}, Pick {drafted.pick}{draftTeam ? ` by the ${draftTeam.name}` : ''}
          {player.college && <small> out of {player.college}</small>}
        </div>
      )}
      {!newestFirst.length && <p className="dim">{player.status === 'prospect' ? 'Still in college: no MFL teams yet.' : 'No teams on record yet.'}</p>}
      <ol className="career-list">
        {newestFirst.map((s, i) => {
          const team = getTeam(s.teamId) || { name: s.teamId, code: s.teamId };
          const current = s.teamId === player.teamId && i === 0;
          const leftHow = !current && s.teamId === player.previousTeamId ? LEFT[player.leftHow] : null;
          return (
            <li key={`${s.teamId}-${s.from}`} className={current ? 'now' : ''} style={{ '--team': team.color }}>
              <div className="career-team">
                <TeamBadge team={team} size="sm" />
                <b>{team.name}</b>
                <span className="dim">{seasons(s.from, s.to)}</span>
                {current && <span className="career-tag">Now</span>}
              </div>
              <ul className="career-deals">
                {[...s.deals].reverse().map((d) => (
                  <li key={`${d.firstSeason}-${d.source}-${d.total}`}>
                    <span>{DEAL_SOURCE[d.source] || 'Contract'}</span>
                    <b>{money(d.perYear)}/yr</b>
                    <span className="dim">{d.lastSeason - d.firstSeason + 1} yr · {money(d.total)} total · S{d.firstSeason}–S{d.lastSeason}</span>
                    <em>{DEAL_STATUS[d.status] || d.status}</em>
                  </li>
                ))}
              </ul>
              {leftHow && <div className="career-left">↪ {leftHow}</div>}
            </li>
          );
        })}
      </ol>
      {startedWithImport && <p className="dim career-note">The site's records start in Season 7, so teams before that aren't listed.</p>}
    </div>
  );
}
