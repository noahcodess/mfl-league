import React from 'react';
import { createPortal } from 'react-dom';
import TeamBadge from './TeamBadge.jsx';
import { getTeam } from '../data/teams.js';

// TV-style crawl pinned to the bottom of the screen: the latest picks first, scrolling forever behind the MFL DRAFT tag.
export default function DraftTicker({ picks, season }) {
  const recent = [...(picks || [])].reverse().slice(0, 16);
  const items = recent.length ? recent : null;
  const row = (key) => (
    <div className="ticker-row" key={key} aria-hidden={key === 'b'}>
      {items ? items.map((s) => {
        const team = getTeam(s.team_id) || { code: s.team_id, name: s.team_id };
        return (
          <span className="ticker-item" key={`${key}-${s.pick_no}`}>
            <b>#{s.pick_no}</b> <TeamBadge team={team} size="sm" /> {team.code}: <strong>{s.player?.name}</strong> <em>{s.player?.position} · {s.player?.college}</em>
          </span>
        );
      }) : <span className="ticker-item">MFL Draft · Season {season} · Every pick shows up here live</span>}
    </div>
  );
  return createPortal(
    <div className="ticker">
      <span className="ticker-tag">MFL DRAFT</span>
      <div className="ticker-window">
        <div className="ticker-track" style={{ '--speed': `${Math.max(24, (items?.length || 2) * 5)}s` }}>{row('a')}{row('b')}</div>
      </div>
    </div>,
    document.body,
  );
}
