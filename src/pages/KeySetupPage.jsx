import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import SecretReveal from '../components/SecretReveal.jsx';
import Field from '../components/Field.jsx';
import { makeKey, groupKey, cleanKey } from '../lib/makeKey.js';
import { setKey } from '../data/commish.js';
import { signOut } from '../data/session.js';

// Commissioner's first login only: the browser makes his key, shows it once, and he proves he saved it by typing it back.
export default function KeySetupPage({ session }) {
  const [key] = useState(makeKey);
  const [saved, setSaved] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (cleanKey(typed) !== key) return setError("That doesn't match. Check your saved copy and try again.");
    setBusy(true);
    setError('');
    try {
      await setKey(key);
      await session.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard wide step="Step 2 of 2" title="Your commissioner key"
      sub="This key is the extra lock on the commissioner account. You'll enter it every time you log in as commissioner.">
      <SecretReveal label="Commissioner key" value={key} display={groupKey(key)} />
      <ul className="checks">
        <li>Save it somewhere private right now: a password manager or a locked note.</li>
        <li>This is the only time it will ever be shown. Nobody else can see it, including the site owner.</li>
        <li>Spaces don't matter when you type it in.</li>
      </ul>
      <form onSubmit={submit}>
        <label className="check-row"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I saved my key somewhere private</label>
        {saved && <Field id="key-confirm" label="Type or paste it back to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck="false" />}
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={!saved || !typed || busy}>{busy ? 'Locking it in...' : 'Finish setup'}</button>
        <button type="button" className="link-btn" onClick={() => signOut(false)}>Log out</button>
      </form>
    </AuthCard>
  );
}
