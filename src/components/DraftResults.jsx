import React, { useState } from 'react';
import TeamBadge from './TeamBadge.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import GradeStamp from './GradeStamp.jsx';
import { getTeam } from '../data/teams.js';

// Every pick by round: who went where, with the grade. Picks still to come show the team that owns them. Tap a pick for the grade breakdown.
export default function DraftResults({ slots, picks, onPickNo }) {
  const [round, setRound] = useState(() => Math.min(3, Math.max(1, picks.length ? picks[picks.length - 1].round : 1)));
  const [open, setOpen] = useState(null);
  const byNo = Object.fromEntries(picks.map((p) => [p.pick_no, p]));
  return (
    <div className="results">
      <div className="board-head"><span className="dim">{picks.length} of {slots.length} picks made</span>
        <div className="seg">{[1, 2, 3].map((r) => <button key={r} className={round === r ? 'on' : ''} onClick={() => setRound(r)}>Round {r}</button>)}</div>
      </div>
      <ol className="results-list">
        {slots.filter((s) => s.round === round).map((s, i) => {
          const pick = byNo[s.pick_no];
          const team = getTeam(s.team_id) || { code: s.team_id, name: s.team_id };
          const via = s.original_team_id !== s.team_id ? getTeam(s.original_team_id)?.code : null;
          const now = s.pick_no === onPickNo;
          return (
            <li key={s.pick_no} className={`${pick ? 'made' : 'todo'}${now ? ' now' : ''}`} style={{ '--i': i, '--team': team.color }} onClick={() => pick && setOpen(open === s.pick_no ? null : s.pick_no)}>
              <span className="res-no">{s.pick_no}</span>
              <TeamBadge team={team} size="sm" />
              {pick ? (
                <>
                  <Headshot player={pick.player} team={team} size={36} />
                  <span className="res-who"><b>{pick.player?.name}</b><small>{pick.player?.position} · {pick.player?.college}{via ? ` · via ${via}` : ''}{pick.how === 'auto' ? ' · auto pick' : ''}</small></span>
                  <StarRating value={pick.player?.stars} />
                  {pick.grade && <GradeStamp grade={pick.grade} size="sm" />}
                </>
              ) : <span className="res-who dim">{now ? 'On the clock...' : `${team.name}${via ? ` (via ${via})` : ''}`}</span>}
              {open === s.pick_no && pick?.grade_notes && <ul className="res-notes">{pick.grade_notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
