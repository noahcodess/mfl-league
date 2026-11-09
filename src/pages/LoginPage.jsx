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
    <AuthCard title="Coach Login" sub="Log in to run your team. No account? The commissioner sets them up.">
      {notice && <div className="form-error">{notice}</div>}
      <form onSubmit={submit}>
        <Field id="login-user" label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        <Field id="login-pass" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <div className="form-error">{error}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
      </form>
    </AuthCard>
  );
}
