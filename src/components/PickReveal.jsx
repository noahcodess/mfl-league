import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import TeamBadge from './TeamBadge.jsx';
import Headshot from './Headshot.jsx';
import StarRating from './StarRating.jsx';
import GradeStamp from './GradeStamp.jsx';
import { getTeam } from '../data/teams.js';
import { POSITION_NAMES } from '../data/positions.js';
import { heightLabel } from '../lib/format.js';

// The big moment. variant 'full' (picks 1-10): "THE PICK IS IN", logo slam, card flip, grade stamp, then the reasons fly in.
// 'big' (rest of round 1): same show, grade only. 'quick' (rounds 2-3): a banner slides across with the grade. The drafting coach also sees his rookie's potential unlock. Tap to skip.
export default function PickReveal({ pick, potential, mine, variant = 'full', onDone }) {
  const team = getTeam(pick.team_id) || { name: pick.team_id, code: pick.team_id, color: '#444', accent: '#fff' };
  const p = pick.player;
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    x: (i * 37) % 100, d: (i % 9) * 0.12, s: 6 + (i % 4) * 3, c: [team.color, team.accent, '#ffd23f', '#ffffff'][i % 4],
  })), [team.color, team.accent]);
  if (!p) return null;
  const style = { '--team': team.color, '--team-accent': team.accent };
  const pot = mine && (
    <div className="reveal-pot"><span className="reveal-lock">🔓</span><span>Potential</span>
      {potential != null ? <StarRating value={potential} elite={potential === 5} showNumber /> : <span className="dim">loading...</span>}</div>
  );

  if (variant === 'quick') {
    return createPortal(
      <div className="qreveal" style={style} onClick={onDone} role="status">
        <div className="qreveal-no">#{pick.pick_no}</div>
        <TeamBadge team={team} size="md" />
        <Headshot player={p} team={team} size={64} />
        <div className="qreveal-body">
          <small>{team.name} select</small>
          <b>{p.name}</b>
          <span>{p.position} · {p.college} · <StarRating value={p.stars} /></span>
          {pot}
        </div>
        {pick.grade && <GradeStamp grade={pick.grade} size="sm" />}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className={`reveal reveal-${variant}`} style={style} onClick={onDone} role="dialog" aria-label={`${team.name} pick ${pick.pick_no}: ${p.name}`}>
      <div className="reveal-burst" />
      <div className="reveal-rays" />
      <div className="reveal-in">THE PICK<br />IS IN</div>
      <div className="reveal-team">
        <TeamBadge team={team} size="xl" />
        <div className="reveal-pickno">Round {pick.round} · Pick {pick.slot} <span>#{pick.pick_no} overall</span></div>
      </div>
      <div className="reveal-card">
        <div className="reveal-shot"><Headshot player={p} team={team} size={168} /></div>
        <div className="reveal-body">
          <div className="reveal-teamname">{team.name} select</div>
          <div className="reveal-name">{p.name}</div>
          <div className="reveal-pos">{POSITION_NAMES[p.position] || p.position} · {p.college}</div>
          <div className="reveal-facts"><span>Age {p.age}</span><span>{heightLabel(p.height)}{p.weight ? `, ${p.weight} lbs` : ''}</span><span>#{p.number ?? '-'}</span></div>
          <div className="reveal-stars"><StarRating value={p.stars} showNumber /></div>
          {pot}
          {pick.how === 'auto' && <div className="reveal-auto">⏱ Time ran out: picked for them</div>}
        </div>
        {pick.grade && (
          <div className="reveal-grade">
            <GradeStamp grade={pick.grade} />
            {variant === 'full' && <ul>{(pick.grade_notes || []).slice(0, 4).map((n, i) => <li key={n} style={{ '--i': i }}>{n}</li>)}</ul>}
          </div>
        )}
      </div>
      <div className="reveal-confetti" aria-hidden="true">
        {confetti.map((c, i) => <i key={i} style={{ left: `${c.x}%`, animationDelay: `${2.7 + c.d}s`, width: c.s, height: c.s, background: c.c }} />)}
      </div>
      <div className="reveal-skip">tap to skip</div>
    </div>,
    document.body,
  );
}
