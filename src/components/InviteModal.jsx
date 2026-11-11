import React from 'react';
import Modal from './Modal.jsx';
import SecretReveal from './SecretReveal.jsx';
import { getTeam } from '../data/teams.js';
import { shortDate } from '../lib/format.js';

// Popup after making a coach's passcode: shows it exactly once, with what to tell them.
export default function InviteModal({ invite, onClose }) {
  if (!invite) return null;
  const team = getTeam(invite.team_id);
  return (
    <Modal>
      <h2>Passcode for Coach {invite.coach_name}</h2>
      <p>Send this to <b>Coach {invite.coach_name}</b> ({team?.name}) in a private message. That's all you have to do.</p>
      <SecretReveal label="One-time passcode" value={invite.code} />
      <ol className="login-steps">
        <li>On the MFL site they click <b>Log in</b>, then <b>First time here</b>.</li>
        <li>They enter this passcode once.</li>
        <li>They make their own username and password and use those from then on.</li>
      </ol>
      <p className="secret-warn">This is the only time the passcode is shown. It works once and expires {shortDate(invite.expires_at)}. Lost it? Cancel it below and make a new one.</p>
      <div className="modal-actions"><button className="btn" onClick={onClose}>Done</button></div>
    </Modal>
  );
}
