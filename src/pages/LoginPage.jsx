import React, { useState } from 'react';
import AuthCard from '../components/AuthCard.jsx';
import Field from '../components/Field.jsx';
import { signIn } from '../data/session.js';

// Username and password login for coaches and the commissioner.
export default function LoginPage({ notice }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Coach Login" sub="Use the username and temporary password the commissioner sent you. Your team is already set up and waiting.">
      {notice && <div className="form-error">{notice}</div>}
      <form onSubmit={submit}>
        <Field id="login-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        <Field id="login-pass" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
      <ol className="login-steps">
        <li>The commissioner gives you a username and a temporary password (usually by Discord DM).</li>
        <li>Log in with them. You'll pick your own password right away.</li>
        <li>You land on your team. Forgot your password? Ask the commissioner to reset it.</li>
      </ol>
    </AuthCard>
  );
}
