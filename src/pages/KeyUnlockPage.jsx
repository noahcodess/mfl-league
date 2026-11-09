import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import { unlock } from '../data/commish.js';
import { signOut } from '../data/session.js';
import { cleanKey } from '../lib/makeKey.js';

// Every commissioner login after setup: password got him here, the key unlocks his powers for 12 hours.
export default function KeyUnlockPage({ session }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (await unlock(cleanKey(typed))) return await session.refresh();
      setError('Wrong key. After 5 wrong tries it locks for 15 minutes.');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <AuthCard step="Commissioner" title="Enter your key" sub={`Password accepted, ${session.profile.display_name || session.profile.username}. Now the commissioner key.`}>
      <form onSubmit={submit}>
        <Field id="key" label="Commissioner key" type="password" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck="false" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Checking...' : 'Unlock'}</button>
        <button type="button" className="link-btn" onClick={() => signOut(true)}>Log out</button>
      </form>
    </AuthCard>
  );
}
