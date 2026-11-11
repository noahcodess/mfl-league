import React from 'react';
import TeamBadge from './TeamBadge.jsx';
import TradeMoves from './TradeMoves.jsx';
import { usePlayerHistory, DEAL_SOURCE, DEAL_STATUS } from '../data/playerHistory.js';
import { getTeam } from '../data/teams.js';
import { money } from '../lib/format.js';

const LEFT = { let_go: 'Not re-signed: went to free agency', talks_failed: 'Contract talks fell apart', walked: 'Walked in free agency' };
const seasons = (a, b) => (a === b ? `Season ${a}` : `Seasons ${a}–${b}`);

// "Past teams" tab: his draft pick, his college under it, every team he's played for and the deals he signed (newest first), then his trades.
export default function PastTeams({ player }) {
  const history = usePlayerHistory(player);
  if (!history) return <p className="dim">Loading his history...</p>;
  const { stints, drafted, moves } = history;
  const draftTeam = drafted ? getTeam(drafted.teamId) : null;
  const newestFirst = [...stints].reverse();
  const startedWithImport = stints[0]?.deals[0]?.source === 'import';
  return (
    <div className="career">
      {drafted && (
        <div className="career-draft">
          🏈 Drafted in the <b>Season {drafted.season} draft</b> · Round {drafted.round}, Pick {drafted.pick}{draftTeam ? ` by the ${draftTeam.name}` : ''}
        </div>
      )}
      {player.college && <div className="career-college">🎓 College: <b>{player.college}</b></div>}
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
      <TradeMoves moves={moves} />
      {startedWithImport && <p className="dim career-note">Contract records start in Season 7. Trades go back to Season 1.</p>}
    </div>
  );
}
