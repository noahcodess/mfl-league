import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import { changePassword, signOut, PASSWORD_MIN } from '../data/session.js';

// First login (or after a reset): swap the temporary password for one only you know.
export default function ChangePasswordPage({ session }) {
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isCommish = session.profile.role === 'commissioner';

  const submit = async (e) => {
    e.preventDefault();
    if (pass !== again) return setError("Those two passwords don't match");
    setBusy(true);
    setError('');
    try {
      await changePassword(pass);
      await session.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard step={isCommish ? 'Step 1 of 2' : null} title="Pick your password"
      sub={`Welcome, ${session.profile.display_name || session.profile.username}. Your temporary password worked. Now choose your own. Nobody else will be able to see it, not even the commissioner.`}>
      <form onSubmit={submit}>
        <Field id="new-pass" label="New password" type="password" value={pass} onChange={(e) => setPass(e.target.value)}
          hint={`At least ${PASSWORD_MIN} characters`} autoComplete="new-password" required />
        <Field id="new-pass-2" label="Type it again" type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
        <button type="button" className="link-btn" onClick={() => signOut(false)}>Log out</button>
      </form>
    </AuthCard>
  );
}
