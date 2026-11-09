import React from 'react';
import SecretReveal from './SecretReveal.jsx';

// Popup after creating or resetting a coach: shows their temporary password exactly once.
export default function TempPasswordModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <h2>{result.isNew ? 'Coach account created' : 'Password reset'}</h2>
        <p>Send these to <b>{result.username}</b> in a private message. They'll pick their own password the first time they log in.</p>
        <SecretReveal label="Username" value={result.username} />
        <SecretReveal label="Temporary password" value={result.tempPassword} />
        <p className="secret-warn">This is the only time this password is shown. If it gets lost, just reset it again.</p>
        <div className="modal-actions"><button className="btn" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}
