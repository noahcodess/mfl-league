import React from 'react';
import UniformSprite from './UniformSprite.jsx';
import { whereWorn } from '../data/jerseys.js';

// One of a team's four uniforms: the player wearing it, its name, where it can be worn, and a pending badge or Edit button.
export default function JerseyCard({ jersey, model, team, pending, onEdit, editLabel = 'Edit' }) {
  return (
    <div className={`jersey-card${pending ? ' pending' : ''}`} style={{ '--jc': jersey.colors.jersey }}>
      <div className="jersey-stage"><UniformSprite colors={pending?.colors || jersey.colors} player={model} team={team} scale={3} /></div>
      <b>{pending?.name || jersey.name}</b>
      <small>{whereWorn(jersey)}</small>
      {pending ? <span className="jersey-pending">⏳ Waiting on the commissioner</span> : onEdit && <button className="btn small ghost" onClick={onEdit}>{editLabel}</button>}
    </div>
  );
}
